/* =====================================================================
   ADVENTURE GUIDE — data helpers (pure; no page code here)
   The website's view-only guide to Romblon reads the same public data as
   the app, straight from Firestore's REST API: places, terminals (ports
   and their ferries), live status, bankas, tricycle fares, hotlines and
   events. Used by js/guide.js in the browser and by node --test.
   ===================================================================== */
(function (root) {
  'use strict';

  var PROJECT = 'romblon-5782d';
  var BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT +
    '/databases/(default)/documents/';

  var TOWNS = [
    'Alcantara', 'Banton', 'Cajidiocan', 'Calatrava', 'Concepcion', 'Corcuera',
    'Ferrol', 'Looc', 'Magdiwang', 'Odiongan', 'Romblon', 'San Agustin',
    'San Andres', 'San Fernando', 'San Jose', 'Santa Fe', 'Santa Maria'
  ];

  // The app's categories, in the order the website shows them.
  var CATEGORIES = [
    { id: 'Tourist Spot', label: 'Tourist spots' },
    { id: 'Food & Dining', label: 'Food' },
    { id: 'Accommodation', label: 'Places to stay' },
    { id: 'Shopping', label: 'Shopping' },
    { id: 'Entertainment', label: 'Things to do' },
    { id: 'Services', label: 'Services' }
  ];

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ── Firestore REST values → plain JS ────────────────────────────────
  function decode(v) {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
    if ('mapValue' in v) return fields(v.mapValue.fields || {});
    return null;
  }
  function fields(f) {
    var o = {};
    Object.keys(f || {}).forEach(function (k) { o[k] = decode(f[k]); });
    return o;
  }
  /** A REST document → its data plus `id`. */
  function docOf(d) {
    var o = fields(d.fields || {});
    o.id = String(d.name || '').split('/').pop();
    return o;
  }

  // ── Small text helpers ──────────────────────────────────────────────
  function str(v) { return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim(); }
  function norm(s) { return str(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function sameTown(a, b) {
    var x = norm(a).replace(/\b(port|terminal|municipality of)\b/g, ' ').trim();
    var y = norm(b).replace(/\b(port|terminal|municipality of)\b/g, ' ').trim();
    return !!x && !!y && x === y;
  }
  /** Only https links (Firebase Storage and the like). */
  function safeUrl(u) { return typeof u === 'string' && /^https:\/\//i.test(u.trim()) ? u.trim() : null; }
  function peso(n) {
    if (n == null || n === '') return '';
    var x = Number(n);
    return isFinite(x) ? '₱' + x.toLocaleString('en-PH', { maximumFractionDigits: 2 }) : str(n);
  }
  /** "Bonbon Beach" → "bonbon-beach" (for readable links). */
  function slug(s) { return norm(s).replace(/\s+/g, '-'); }

  // ── Places ──────────────────────────────────────────────────────────
  /** The place's photo links, main first, no repeats. */
  function photos(p) {
    var out = [];
    function add(u) { var s = safeUrl(u); if (s && out.indexOf(s) < 0) out.push(s); }
    add(p.image);
    (p.images || []).forEach(function (i) { add(i && typeof i === 'object' ? i.url : i); });
    (p.galleryImages || []).forEach(function (i) { add(i && typeof i === 'object' ? i.url : i); });
    return out;
  }

  /** Shown on the website: has a name, isn't hidden or waiting for review. */
  function isPublic(p) {
    return !!str(p.name) && p.is_active !== false && p.isActive !== false &&
      p.reviewStatus !== 'pending' && p.reviewStatus !== 'rejected';
  }

  /**
   * Places matching [f] (town, cat, q), featured / must-visit first,
   * then by name.
   */
  function filterPlaces(places, f) {
    f = f || {};
    var q = norm(f.q);
    return places.filter(isPublic).filter(function (p) {
      if (f.town && !sameTown(p.municipality, f.town)) return false;
      if (f.cat && p.category !== f.cat) return false;
      if (q) {
        var hay = norm([p.name, p.placeType, p.category, p.municipality, p.barangay, p.summary].join(' '));
        if (q.split(' ').some(function (w) { return hay.indexOf(w) < 0; })) return false;
      }
      return true;
    }).sort(function (a, b) {
      var ra = (a.isMustVisit ? 2 : 0) + (a.isFeatured ? 1 : 0);
      var rb = (b.isMustVisit ? 2 : 0) + (b.isFeatured ? 1 : 0);
      return rb - ra || str(a.name).localeCompare(str(b.name));
    });
  }

  /** "Closed today" / "Closed until Nov 24" set by the owner, or "". */
  function closedLabel(p, today) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(p.closedUntil));
    if (!m) return '';
    var until = new Date(+m[1], +m[2] - 1, +m[3]);
    var day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (until < day) return '';
    if (until.getTime() === day.getTime()) return 'Closed today';
    return 'Closed until ' + MONTHS[until.getMonth()].slice(0, 3) + ' ' + until.getDate();
  }
  /** The owner's promo while it runs, or "". */
  function promoText(p, today) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(p.promoUntil));
    if (!str(p.promoText) || !m) return '';
    var until = new Date(+m[1], +m[2] - 1, +m[3]);
    var day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return until < day ? '' : str(p.promoText);
  }

  /** Hours as one line: the text, or the day schedules. */
  function hoursText(p) {
    if (typeof p.hours === 'string' && str(p.hours)) return str(p.hours);
    var s = p.daySchedules;
    if (!Array.isArray(s) || !s.length) return '';
    return s.map(function (d) {
      var days = (d.days || []).map(function (x) { return str(x).slice(0, 3); }).join(', ');
      var time = d.closed ? 'Closed' : [str(d.open), str(d.close)].filter(Boolean).join(' – ');
      return [days, time].filter(Boolean).join(' ');
    }).filter(Boolean).join(' · ');
  }

  /** Prices for the place's kind: room prices, entrance fee or a range. */
  function priceText(p) {
    if (p.category === 'Accommodation') {
      var a = peso(p.roomPriceFrom), b = peso(p.roomPriceTo);
      return a && b ? a + ' – ' + b + ' a night' : a ? 'From ' + a + ' a night' : '';
    }
    if (p.category === 'Tourist Spot' || p.category === 'Entertainment') return str(p.entryFee);
    return str(p.priceRange);
  }

  // ── Ferries ─────────────────────────────────────────────────────────
  /** "Tuesday, Thursday" lists → "Tue, Thu" / "Daily". */
  function daysText(days) {
    var list = (days || []).map(str).filter(Boolean);
    if (list.length >= 7) return 'Daily';
    return list.sort(function (a, b) { return WEEK.indexOf(a) - WEEK.indexOf(b); })
      .map(function (d) { return d.slice(0, 3); }).join(', ');
  }

  /**
   * Every ferry route from every port: { id, from, to, operator, vessel,
   * terminal, town, sailings: [{days, time}] }, sorted by from → to.
   */
  function ferryRoutes(terminals) {
    var out = [];
    (terminals || []).forEach(function (t) {
      (t.ferries || []).forEach(function (f) {
        (f.routes || []).forEach(function (r) {
          if (!str(r.from) || !str(r.to)) return;
          var sailings = (r.daySchedules || []).filter(function (s) { return !s.closed; })
            .map(function (s) { return { days: daysText(s.days), time: str(s.open) }; })
            .filter(function (s) { return s.days || s.time; });
          out.push({
            id: str(r.id), from: str(r.from), to: str(r.to),
            operator: str(f.name), vessel: str(f.vesselName), type: str(f.vesselType),
            terminal: str(t.name), town: str(t.municipality), sailings: sailings
          });
        });
      });
    });
    return out.sort(function (a, b) {
      return a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.operator.localeCompare(b.operator);
    });
  }

  /** Today in Manila as YYYY-MM-DD. */
  function manilaToday(now) {
    return new Date((now || new Date()).getTime() + 8 * 3600e3).toISOString().slice(0, 10);
  }

  /** Delays and cancellations still in effect (not after their last day). */
  function activeAdvisories(statuses, now) {
    var today = manilaToday(now);
    return (statuses || []).filter(function (s) {
      if (s.status !== 'delayed' && s.status !== 'cancelled') return false;
      var until = str(s.untilDate) || str(s.effectiveDate);
      return !until || until >= today;
    }).sort(function (a, b) { return str(a.effectiveDate).localeCompare(str(b.effectiveDate)); });
  }

  // ── Bankas, fares, hotlines ─────────────────────────────────────────
  function active(x) { return x && x.is_active !== false; }

  function boatsIn(boats, town) {
    return (boats || []).filter(active).filter(function (b) { return sameTown(b.municipality, town); })
      .sort(function (a, b) { return str(a.to_label).localeCompare(str(b.to_label)); });
  }

  function boatFare(b) {
    var parts = [];
    if (b.service !== 'CHARTER' && b.fare_per_person != null) parts.push(peso(b.fare_per_person) + ' per person');
    if (b.service !== 'SCHEDULED' && b.charter_price != null) {
      parts.push(peso(b.charter_price) + ' for the boat' + (b.charter_capacity ? ' (up to ' + b.charter_capacity + ')' : ''));
    }
    return parts.join(' · ');
  }

  function boatSchedule(b) {
    var days = (b.days || []).map(Number).filter(function (d) { return d >= 1 && d <= 7; });
    var d = days.length >= 7 ? 'Daily' : days.map(function (x) { return WEEK[x - 1].slice(0, 3); }).join(', ');
    return [d, (b.trips || []).join(' · ')].filter(Boolean).join(' — ');
  }

  function faresIn(fares, town) {
    var rank = { PORT: 0, TOWN_CENTER: 1 };
    return (fares || []).filter(active).filter(function (f) { return sameTown(f.municipality, town); })
      .sort(function (a, b) {
        return ((rank[a.from_kind] != null ? rank[a.from_kind] : 2) - (rank[b.from_kind] != null ? rank[b.from_kind] : 2)) ||
          str(a.to_label).localeCompare(str(b.to_label));
      });
  }

  var PROVINCE_WIDE = 'Romblon (province-wide)';
  var HOTLINE_ORDER = ['POLICE', 'MDRRMO', 'FIRE', 'COAST_GUARD', 'HOSPITAL', 'HEALTH', 'TOURISM', 'PORT', 'LGU', 'OTHER'];
  var HOTLINE_LABEL = {
    POLICE: 'Police', FIRE: 'Fire', MDRRMO: 'Rescue (MDRRMO)', HEALTH: 'Health center',
    HOSPITAL: 'Hospital', COAST_GUARD: 'Coast Guard', TOURISM: 'Tourism Office', PORT: 'Port',
    LGU: 'Municipal hall', OTHER: 'Other'
  };

  /** 911, then [town]'s numbers by urgency, then province-wide ones. */
  function hotlinesFor(hotlines, town) {
    function rank(h) { var i = HOTLINE_ORDER.indexOf(h.kind); return i < 0 ? 99 : i; }
    var list = (hotlines || []).filter(active).filter(function (h) {
      return str(h.name) && (h.phones || []).length;
    });
    var own = list.filter(function (h) { return town && sameTown(h.municipality, town); })
      .sort(function (a, b) { return rank(a) - rank(b); });
    var prov = list.filter(function (h) { return h.municipality === PROVINCE_WIDE; })
      .sort(function (a, b) { return rank(a) - rank(b); });
    return [{ kind: 'EMERGENCY', name: 'National emergency hotline', phones: ['911'], label: 'Emergency' }]
      .concat(own, prov).map(function (h) {
        return { kind: h.kind, name: str(h.name), phones: h.phones.map(str), notes: str(h.notes),
          label: h.label || HOTLINE_LABEL[h.kind] || 'Other', province: h.municipality === PROVINCE_WIDE };
      });
  }

  /** Digits and a leading + (for tel: links). */
  function dialable(p) { return str(p).replace(/[^0-9+]/g, ''); }

  // ── Events ──────────────────────────────────────────────────────────
  /** When an event happens, as words: "May 15", "May 14–16", "Every May". */
  function eventWhen(e) {
    var one = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(e.one_time_date));
    if (one) return MONTHS[+one[2] - 1] + ' ' + (+one[3]) + ', ' + one[1];
    var m = Number(e.month);
    if (!(m >= 1 && m <= 12)) return '';
    var start = Number(e.day_start || e.day), end = Number(e.day_end);
    if (start && end && end !== start) return MONTHS[m - 1] + ' ' + start + '–' + end;
    if (start) return MONTHS[m - 1] + ' ' + start;
    return 'Every ' + MONTHS[m - 1];
  }

  /** The event's month (1–12), or 0 when unknown. */
  function eventMonth(e) {
    var one = /^(\d{4})-(\d{2})/.exec(str(e.one_time_date));
    if (one) return +one[2];
    var m = Number(e.month);
    return m >= 1 && m <= 12 ? m : 0;
  }

  /** Active events by month, starting from [fromMonth] (1–12). */
  function eventsByMonth(events, fromMonth, town) {
    var list = (events || []).filter(function (e) { return e.is_active !== false && str(e.title); })
      .filter(function (e) { return !town || sameTown(e.municipality_name, town); });
    var groups = [];
    for (var i = 0; i < 12; i++) {
      var m = ((fromMonth - 1 + i) % 12) + 1;
      var items = list.filter(function (e) { return eventMonth(e) === m; }).sort(function (a, b) {
        return (Number(a.day_start || a.day) || 0) - (Number(b.day_start || b.day) || 0);
      });
      if (items.length) groups.push({ month: m, name: MONTHS[m - 1], events: items });
    }
    return groups;
  }

  // ── Islands ─────────────────────────────────────────────────────────
  var ISLANDS = [
    ['Tablas', ['Alcantara', 'Calatrava', 'Ferrol', 'Looc', 'Odiongan', 'San Agustin', 'San Andres', 'Santa Fe', 'Santa Maria']],
    ['Romblon Island', ['Romblon']],
    ['Sibuyan', ['Cajidiocan', 'Magdiwang', 'San Fernando']],
    ['Carabao', ['San Jose']],
    ['Banton, Simara & Maestre de Campo', ['Banton', 'Corcuera', 'Concepcion']]
  ];

  /** The island group a town is on. */
  function islandOf(town) {
    for (var i = 0; i < ISLANDS.length; i++) {
      if (ISLANDS[i][1].some(function (t) { return sameTown(t, town); })) return ISLANDS[i][0];
    }
    return '';
  }

  /** [{island, towns}] in the order travelers usually go. */
  function townsByIsland() {
    return ISLANDS.map(function (g) { return { island: g[0], towns: g[1].slice() }; });
  }

  /** How many public places have each value of [key]. */
  function countBy(places, key) {
    var out = {};
    (places || []).filter(isPublic).forEach(function (p) {
      var k = str(p[key]);
      if (k) out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  // ── Island hopping tours ─────────────────────────────────────────────
  var INCLUSION_LABEL = {
    life_vests: 'Life vests', snorkel: 'Snorkel gear', lunch: 'Lunch', drinks: 'Drinking water',
    fees: 'Entrance / environmental fees', guide: 'Guide', cottage: 'Cottage / shade'
  };

  function realStops(t) { return (t.stops || []).filter(function (s) { return s && str(s.name); }); }

  /** Tours to show (active, named, 2+ stops), optionally in [town], by name. */
  function toursShown(tours, town) {
    return (tours || []).filter(function (t) {
      return t && t.is_active !== false && str(t.name) && realStops(t).length >= 2 &&
        (!town || sameTown(t.municipality, town));
    }).sort(function (a, b) { return str(a.name).localeCompare(str(b.name)); });
  }
  function tourRoute(t) { return realStops(t).map(function (s) { return str(s.name); }).join(' → '); }
  function tourPrice(t) {
    return [
      t.price_per_boat != null && t.price_per_boat !== '' ? peso(t.price_per_boat) + ' for the boat' + (t.capacity ? ' (up to ' + t.capacity + ')' : '') : '',
      t.price_per_person != null && t.price_per_person !== '' ? peso(t.price_per_person) + ' per person' : ''
    ].filter(Boolean).join(' · ');
  }
  function tourIncluded(t) {
    return (t.inclusions || []).map(function (i) { return INCLUSION_LABEL[i]; }).filter(Boolean)
      .concat((t.custom_inclusions || []).map(str).filter(Boolean));
  }
  function tourMonths(t) {
    var m = (t.best_months || []).map(Number).filter(function (x) { return x >= 1 && x <= 12; }).sort(function (a, b) { return a - b; });
    return m.length ? 'Best ' + m.map(function (x) { return MONTHS[x - 1].slice(0, 3); }).join(', ') : '';
  }
  /** The offer while it runs, or "". */
  function tourOffer(t, today) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(t.offer_until));
    if (!str(t.offer_text) || !m) return '';
    var until = new Date(+m[1], +m[2] - 1, +m[3]);
    var day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return until < day ? '' : str(t.offer_text);
  }
  /** Tours that stop at, or start from, place [id]. */
  function toursForPlace(tours, id) {
    return (tours || []).filter(function (t) {
      return id && (t.start_place_id === id || realStops(t).some(function (s) { return s.place_id === id; }));
    });
  }

  // ── Pasalubong ──────────────────────────────────────────────────────
  /** Published makers and centers matching [f] (town, kind, category, q); featured first. */
  function pasalubongShown(list, f) {
    f = f || {};
    var q = norm(f.q);
    return (list || []).filter(function (p) {
      if (!p || p.published !== true || !str(p.name)) return false;
      if (f.town && !sameTown(p.municipality, f.town)) return false;
      if (f.kind && (p.kind === 'center' ? 'center' : 'maker') !== f.kind) return false;
      if (f.category && p.category !== f.category) return false;
      if (q) {
        var hay = norm([p.name, p.municipality, p.category, (p.products || []).join(' ')].join(' '));
        if (q.split(' ').some(function (w) { return hay.indexOf(w) < 0; })) return false;
      }
      return true;
    }).sort(function (a, b) {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || str(a.name).localeCompare(str(b.name));
    });
  }
  /** The phone, only when the owner agreed to show it. */
  function pasalubongPhone(p) { return p.contactConsent ? str(p.phone) : ''; }
  function pasalubongKind(p) { return p.kind === 'center' ? 'Pasalubong center' : 'Maker'; }

  // ── Port departures board ──────────────────────────────────────────
  var BOAT_TYPE = { FASTCRAFT: 'Fastcraft', PASSENGER_BOAT: 'Passenger boat', PUMPBOAT: 'Pumpboat / motorbanca', BANKA: 'Banka' };

  /** "Friday" — the weekday in Manila. */
  function manilaWeekday(now) {
    var d = new Date((now || new Date()).getTime() + 8 * 3600e3);
    return WEEK[(d.getUTCDay() + 6) % 7];
  }

  /** "07:00 PM" / "6:30 AM" → minutes after midnight (unknown last). */
  function timeMinutes(t) {
    var m = /^(\d{1,2}):(\d{2})\s*([AP])\.?M/i.exec(str(t));
    if (!m) return 24 * 60 + 1;
    var h = +m[1] % 12 + (m[3].toUpperCase() === 'P' ? 12 : 0);
    return h * 60 + +m[2];
  }

  /** Ports with at least one route leaving them, A–Z. */
  function boardPorts(terminals) {
    return (terminals || []).filter(function (t) {
      return (t.ferries || []).some(function (f) { return (f.routes || []).some(function (r) { return str(r.from) && str(r.to); }); });
    }).map(function (t) { return { id: t.id, name: str(t.name), town: str(t.municipality) }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  /**
   * A port's departures: one row per sailing (route × schedule), sorted by
   * time, with the live delay / cancellation. [todayOnly]: just the
   * sailings that run today (Manila).
   */
  function portBoard(terminals, statuses, portName, todayOnly, now) {
    var t = (terminals || []).filter(function (x) { return str(x.name) === portName; })[0];
    if (!t) return [];
    var live = activeAdvisories(statuses, now);
    var weekday = manilaWeekday(now);
    var rows = [];
    (t.ferries || []).forEach(function (f) {
      (f.routes || []).forEach(function (r) {
        if (!str(r.from) || !str(r.to)) return;
        var st = live.filter(function (s) { return (s.routeId && s.routeId === r.id) || (!s.routeId && str(s.from) === str(r.from) && str(s.to) === str(r.to)); })[0];
        (r.daySchedules || []).forEach(function (s) {
          if (s.closed) return;
          var days = (s.days || []).map(str).filter(Boolean);
          if (todayOnly && days.length && days.indexOf(weekday) < 0) return;
          rows.push({
            time: str(s.open) || '—',
            to: str(r.to),
            vessel: str(f.vesselName) && str(f.vesselName) !== str(f.name) ? str(f.vesselName) : '',
            operator: str(f.name),
            type: BOAT_TYPE[str(f.vesselType)] || '',
            days: daysText(days),
            status: st ? st.status : '',
            newTime: st ? str(st.newDepartureTime) : '',
            reason: st ? str(st.reason) : ''
          });
        });
      });
    });
    return rows.sort(function (a, b) { return timeMinutes(a.time) - timeMinutes(b.time) || a.to.localeCompare(b.to); });
  }

  var api = {
    manilaWeekday: manilaWeekday, boardPorts: boardPorts, portBoard: portBoard,
    toursShown: toursShown, tourRoute: tourRoute, tourPrice: tourPrice, tourIncluded: tourIncluded,
    tourMonths: tourMonths, tourOffer: tourOffer, toursForPlace: toursForPlace,
    pasalubongShown: pasalubongShown, pasalubongPhone: pasalubongPhone, pasalubongKind: pasalubongKind,
    islandOf: islandOf, townsByIsland: townsByIsland, countBy: countBy,
    PROJECT: PROJECT, BASE: BASE, TOWNS: TOWNS, CATEGORIES: CATEGORIES, MONTHS: MONTHS,
    PROVINCE_WIDE: PROVINCE_WIDE,
    decode: decode, fields: fields, docOf: docOf, str: str, sameTown: sameTown, safeUrl: safeUrl,
    peso: peso, slug: slug, photos: photos, isPublic: isPublic, filterPlaces: filterPlaces,
    closedLabel: closedLabel, promoText: promoText, hoursText: hoursText, priceText: priceText,
    daysText: daysText, ferryRoutes: ferryRoutes, manilaToday: manilaToday,
    activeAdvisories: activeAdvisories, boatsIn: boatsIn, boatFare: boatFare,
    boatSchedule: boatSchedule, faresIn: faresIn, hotlinesFor: hotlinesFor, dialable: dialable,
    eventWhen: eventWhen, eventMonth: eventMonth, eventsByMonth: eventsByMonth
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AdvGuide = api;
})(this);
