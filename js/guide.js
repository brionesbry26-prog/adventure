/* =====================================================================
   ADVENTURE GUIDE — the website's view-only guide to Romblon.
   Pages: explore.html (places), place.html?id=…, town.html?name=…,
   routes.html (ferries, live status, bankas, fares, hotlines) and
   events.html. Reads public data (js/guide-data.js); no accounts, no
   planning, no bucket list. Every page ends with "Get the app".
   Never innerHTML with data: everything from the database is text.
   ===================================================================== */
(function () {
  'use strict';
  var G = window.AdvGuide;
  // The app isn't on Google Play yet: "Get the app" leads to the
  // homepage's coming-soon section, and early access is by email.
  var GET_APP = 'index.html#get-app';
  var EARLY_ACCESS = 'mailto:adventureromblon@yahoo.com?subject=Early%20access%20to%20the%20Adventure%20app';
  var PILOT = 'San Agustin';

  // ── DOM helpers ─────────────────────────────────────────────────────
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== '') n.textContent = text;
    return n;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  }
  function link(href, cls, text) { var a = el('a', cls, text); a.href = href; return a; }
  function img(src, alt, cls) {
    var i = el('img', cls); i.src = src; i.alt = alt || ''; i.loading = 'lazy'; i.decoding = 'async';
    i.onerror = function () { i.remove(); };
    return i;
  }
  function icon(name) { var s = el('span', 'ms', name); s.setAttribute('aria-hidden', 'true'); return s; }
  function param(k) { return new URLSearchParams(location.search).get(k) || ''; }
  function setMeta(title, desc) {
    document.title = title + ' — Adventure';
    var m = document.querySelector('meta[name="description"]');
    if (m && desc) m.setAttribute('content', desc.slice(0, 160));
  }

  // ── Data (cached for 10 minutes in this tab) ────────────────────────
  var LIST_FIELDS = ['name', 'category', 'placeType', 'municipality', 'barangay', 'image', 'images',
    'isFeatured', 'isMustVisit', 'summary', 'reviewStatus', 'is_active', 'closedUntil', 'promoText', 'promoUntil'];

  function cached(key, load) {
    try {
      var hit = JSON.parse(sessionStorage.getItem('adv_' + key) || 'null');
      if (hit && Date.now() - hit.at < 600e3) return Promise.resolve(hit.data);
    } catch (e) { /* no storage */ }
    return load().then(function (data) {
      try { sessionStorage.setItem('adv_' + key, JSON.stringify({ at: Date.now(), data: data })); } catch (e) { /* full */ }
      return data;
    });
  }

  function list(col, mask) {
    return cached(col + (mask ? '_list' : ''), function () {
      var out = [];
      function page(token) {
        var q = ['pageSize=300'];
        (mask || []).forEach(function (f) { q.push('mask.fieldPaths=' + encodeURIComponent(f)); });
        if (token) q.push('pageToken=' + encodeURIComponent(token));
        return fetch(G.BASE + col + '?' + q.join('&')).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (j) {
          (j.documents || []).forEach(function (d) { out.push(G.docOf(d)); });
          return j.nextPageToken ? page(j.nextPageToken) : out;
        });
      }
      return page('');
    });
  }

  function getDoc(col, id) {
    return fetch(G.BASE + col + '/' + encodeURIComponent(id)).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().then(G.docOf);
    });
  }

  // ── Page frame: nav, "get the app", footer ──────────────────────────
  // The same menu as the homepage (index.html).
  // The same menu as the homepage (index.html).
  var NAV = [['explore.html', 'Explore'], ['towns.html', 'Towns'], ['routes.html', 'Ferries & routes'],
    ['island-hopping.html', 'Island hopping'], ['pasalubong.html', 'Pasalubong'], ['events.html', 'Events'],
    ['index.html#app', 'The app']];
  var PAGE_OF = { explore: 'explore.html', towns: 'towns.html', town: 'towns.html', place: 'explore.html',
    routes: 'routes.html', events: 'events.html', islandHopping: 'island-hopping.html', pasalubong: 'pasalubong.html' };

  function frame() {
    var nav = document.getElementById('guide-nav');
    if (nav) {
      var inner = add(el('div', 'wrap g-nav-inner'));
      var brand = link('index.html', 'brand');
      add(brand, img('images/web/logo.webp', '', 'brand-logo'), document.createTextNode('Adventure'));
      var links = el('div', 'g-nav-links');
      var current = PAGE_OF[document.body.dataset.page];
      NAV.forEach(function (n) {
        var a = link(n[0], 'g-nav-link', n[1]);
        if (n[0] === current) a.setAttribute('aria-current', 'page');
        links.appendChild(a);
      });
      var app = link(GET_APP, 'btn btn-primary btn-sm', 'Get the app');
      var burger = el('button', 'g-burger');
      burger.type = 'button'; burger.setAttribute('aria-label', 'Menu'); burger.setAttribute('aria-expanded', 'false');
      burger.appendChild(icon('menu'));
      burger.onclick = function () {
        var open = nav.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      add(inner, brand, links, app, burger);
      nav.appendChild(inner);
    }
    var foot = document.getElementById('guide-foot');
    if (foot) {
      var cta = el('section', 'g-cta');
      var w = el('div', 'wrap g-cta-inner');
      var t = el('div');
      add(t, el('span', 'g-soon', 'Coming soon to Google Play'),
        el('h2', 'g-cta-title', 'Get the full features in the Adventure app'),
        el('p', 'g-cta-sub', 'Day-by-day trip plans around real ferry times, Isla your travel assistant, offline maps, ' +
          'budget and expenses, your bucket list, trip memories and live ferry alerts. Free on Android.'));
      var actions = el('div', 'g-cta-actions');
      add(actions, link(EARLY_ACCESS, 'btn btn-primary', 'Ask for early access'), link(GET_APP, 'btn btn-ghost g-on-dark', 'What the app does'));
      add(w, t, actions); cta.appendChild(w);
      var cols = el('div', 'wrap g-foot-cols');
      var brandCol = el('div', 'g-foot-brand');
      var fb = link('index.html', 'brand');
      add(fb, img('images/web/logo.webp', '', 'brand-logo'), document.createTextNode('Adventure'));
      add(brandCol, fb, el('p', null, 'A travel companion built for Romblon Province — island by island, ferry by ferry.'));
      function col(title, items) {
        var n = el('nav', 'g-foot-col');
        n.setAttribute('aria-label', title);
        n.appendChild(el('h2', null, title));
        var ul = el('ul');
        items.forEach(function (i) { var li = el('li'); li.appendChild(link(i[0], null, i[1])); ul.appendChild(li); });
        n.appendChild(ul);
        return n;
      }
      add(cols, brandCol,
        col('Explore', [['explore.html', 'All places'], ['towns.html', 'Towns'], ['routes.html', 'Ferries & routes'],
          ['island-hopping.html', 'Island hopping'], ['pasalubong.html', 'Pasalubong'], ['events.html', 'Events']]),
        col('Project', [['index.html#app', 'The app'], ['index.html#about', 'About'], ['press.html', 'Press'], ['index.html#contact', 'Contact']]));
      var f = el('div', 'wrap g-foot');
      add(f, el('span', null, '© ' + new Date().getFullYear() + ' Adventure · Romblon, Philippines'),
        link('privacy.html', null, 'Privacy'), link('terms.html', null, 'Terms'));
      add(foot, cta, cols, f);
    }
  }

  function state(box, title, sub) {
    box.textContent = '';
    var s = el('div', 'g-state');
    add(s, el('h2', null, title), sub ? el('p', null, sub) : null);
    box.appendChild(s);
  }
  function loading(box) { state(box, 'Loading…'); }
  function failed(box) { state(box, 'Couldn’t load this', 'Check your connection and try again.'); }

  // ── Shared pieces ───────────────────────────────────────────────────
  function card(p) {
    var a = link('place.html?id=' + encodeURIComponent(p.id), 'g-card');
    var ph = G.photos(p)[0];
    var media = el('div', 'g-card-media');
    if (ph) media.appendChild(img(ph, ''));
    var today = new Date();
    var flag = G.closedLabel(p, today) || (p.isMustVisit ? 'Must visit' : p.isFeatured ? 'Featured' : '');
    if (flag) media.appendChild(el('span', 'g-flag' + (G.closedLabel(p, today) ? ' closed' : ''), flag));
    var body = el('div', 'g-card-body');
    add(body, el('h3', 'g-card-title', p.name),
      el('p', 'g-card-meta', [p.placeType || p.category, p.municipality].filter(Boolean).join(' · ')));
    add(a, media, body);
    return a;
  }

  function grid(items, empty) {
    if (!items.length) return el('p', 'g-empty', empty || 'Nothing here yet.');
    var g = el('div', 'g-grid');
    items.forEach(function (p) { g.appendChild(card(p)); });
    return g;
  }

  function section(title, sub) {
    var s = el('section', 'g-section');
    add(s, el('h2', 'g-h2', title), sub ? el('p', 'g-sub', sub) : null);
    return s;
  }

  function telLink(phone) {
    var a = link('tel:' + G.dialable(phone), 'g-call', phone);
    a.prepend(icon('call'));
    return a;
  }

  function hotlineList(hotlines, town) {
    var wrap = el('div', 'g-hotlines');
    G.hotlinesFor(hotlines, town).forEach(function (h) {
      var row = el('div', 'g-hotline' + (h.kind === 'EMERGENCY' ? ' urgent' : ''));
      var info = el('div');
      add(info, el('span', 'g-kicker', h.province ? h.label + ' · Province' : h.label), el('strong', null, h.name),
        h.notes ? el('p', 'g-muted', h.notes) : null);
      var calls = el('div', 'g-calls');
      h.phones.forEach(function (p) { calls.appendChild(telLink(p)); });
      add(row, info, calls);
      wrap.appendChild(row);
    });
    return wrap;
  }

  function boatList(boats) {
    var wrap = el('div', 'g-rows');
    boats.forEach(function (b) {
      var row = el('div', 'g-row');
      var info = el('div');
      add(info, el('strong', null, G.str(b.from_label) + ' → ' + G.str(b.to_label)),
        el('p', 'g-muted', [G.boatFare(b), G.boatSchedule(b), b.duration_mins ? b.duration_mins + ' min ride' : ''].filter(Boolean).join(' · ')),
        b.operator ? el('p', 'g-muted', b.operator + (b.life_vests ? ' · Life vests on board' : '')) : null,
        b.notes ? el('p', 'g-muted', b.notes) : null);
      var act = el('div', 'g-calls');
      if (b.phone) act.appendChild(telLink(b.phone));
      add(row, info, act);
      wrap.appendChild(row);
    });
    return wrap;
  }

  function fareTable(fares) {
    var t = el('table', 'g-table');
    var head = el('tr');
    ['From → to', 'Shared fare', 'Special trip'].forEach(function (h) { head.appendChild(el('th', null, h)); });
    add(t, el('thead')).firstChild.appendChild(head);
    var body = el('tbody');
    fares.forEach(function (f) {
      var tr = el('tr');
      add(tr, el('td', null, G.str(f.from_label) + ' → ' + G.str(f.to_label)),
        el('td', null, f.shared_fare != null ? G.peso(f.shared_fare) + ' / person' : '—'),
        el('td', null, f.special_fare != null ? G.peso(f.special_fare) : '—'));
      body.appendChild(tr);
    });
    t.appendChild(body);
    var w = el('div', 'g-table-wrap'); w.appendChild(t);
    return w;
  }

  var VESSEL_TYPE = { FASTCRAFT: 'Fastcraft', PASSENGER_BOAT: 'Passenger boat', PUMPBOAT: 'Pumpboat / motorbanca', BANKA: 'Banka' };

  function routeList(routes) {
    var wrap = el('div', 'g-rows');
    routes.forEach(function (r) {
      var row = el('div', 'g-row');
      var info = el('div');
      add(info, el('strong', null, r.from + ' → ' + r.to),
        el('p', 'g-muted', [r.operator, r.vessel && r.vessel !== r.operator ? r.vessel : '', VESSEL_TYPE[r.type] || ''].filter(Boolean).join(' · ')));
      var when = el('div', 'g-when');
      if (!r.sailings.length) when.appendChild(el('span', 'g-muted', 'Schedule varies — ask the port'));
      r.sailings.forEach(function (s) { when.appendChild(el('span', 'g-pill', [s.days, s.time].filter(Boolean).join(' · '))); });
      add(row, info, when);
      wrap.appendChild(row);
    });
    return wrap;
  }

  function advisoryList(advisories) {
    var wrap = el('div', 'g-advisories');
    advisories.forEach(function (s) {
      var a = el('div', 'g-advisory ' + s.status);
      add(a, el('strong', null, (s.status === 'cancelled' ? 'Cancelled: ' : 'Delayed: ') + G.str(s.label || (s.from + ' → ' + s.to))),
        el('p', null, [s.effectiveDate === s.untilDate || !s.untilDate ? s.effectiveDate : s.effectiveDate + ' to ' + s.untilDate,
          s.departureTime ? 'the ' + s.departureTime + ' trip' : '',
          s.newDepartureTime ? 'now ' + s.newDepartureTime : '', s.reason, G.resumeText(s.resumeDate)].filter(Boolean).join(' · ')));
      wrap.appendChild(a);
    });
    return wrap;
  }

  function eventList(groups) {
    var wrap = el('div', 'g-events');
    groups.forEach(function (g) {
      var m = el('div', 'g-month');
      m.appendChild(el('h3', 'g-h3', g.name));
      g.events.forEach(function (e) {
        var ev = el('article', 'g-event');
        var pic = G.safeUrl(e.image_url);
        if (pic) ev.appendChild(img(pic, '', 'g-event-img'));
        var t = el('div');
        add(t, el('span', 'g-kicker', [G.eventWhen(e), e.municipality_name].filter(Boolean).join(' · ')),
          el('strong', null, e.title),
          e.patron_saint ? el('p', 'g-muted', 'In honor of ' + e.patron_saint) : null,
          e.description ? el('p', 'g-muted g-clamp', e.description) : null);
        ev.appendChild(t);
        m.appendChild(ev);
      });
      wrap.appendChild(m);
    });
    return wrap;
  }

  // ── Island hopping & pasalubong ─────────────────────────────────────
  /** Published pasalubong only (the rules let the public read just those). */
  function publishedPasalubong() {
    return cached('pasalubong_published', function () {
      var url = 'https://firestore.googleapis.com/v1/projects/' + G.PROJECT + '/databases/(default)/documents:runQuery';
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: {
          from: [{ collectionId: 'pasalubong' }],
          where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } },
          limit: 500
        } })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (rows) {
        return rows.filter(function (x) { return x.document; }).map(function (x) { return G.docOf(x.document); });
      });
    });
  }

  function tourCard(t) {
    var a = link('island-hopping.html?id=' + encodeURIComponent(t.id), 'g-tour');
    var today = new Date();
    var offer = G.tourOffer(t, today);
    add(a,
      el('span', 'g-kicker', [t.municipality, t.duration_hours ? 'About ' + t.duration_hours + ' hours' : ''].filter(Boolean).join(' · ')),
      el('strong', 'g-tour-name', t.name),
      el('p', 'g-muted', G.tourRoute(t)),
      offer ? el('p', 'g-tour-offer', offer) : null,
      G.tourPrice(t) ? el('p', 'g-tour-price', G.tourPrice(t)) : null);
    return a;
  }

  function tourGrid(tours, empty) {
    if (!tours.length) return el('p', 'g-empty', empty || 'No tours yet.');
    var g = el('div', 'g-tours');
    tours.forEach(function (t) { g.appendChild(tourCard(t)); });
    return g;
  }

  function tourDetail(box, t, places) {
    var today = new Date();
    setMeta(t.name, 'Island hopping in ' + (t.municipality || 'Romblon') + ': ' + G.tourRoute(t) + '. ' + G.tourPrice(t));
    var hero = el('header', 'g-place-hero');
    var cover = (G.str((t.stops || [])[0] && t.stops[0].place_id) && places.filter(function (p) { return p.id === t.stops[0].place_id; })[0]) || null;
    var pic = cover && G.photos(cover)[0];
    if (pic) hero.appendChild(img(pic, t.name, 'g-place-cover'));
    var head = el('div', 'wrap g-place-head');
    var crumbs = el('nav', 'g-crumbs'); crumbs.setAttribute('aria-label', 'Breadcrumb');
    add(crumbs, link('island-hopping.html', null, 'Island hopping'));
    add(head, crumbs, el('h1', 'g-h1', t.name), el('p', 'g-sub', [t.municipality, t.boat_label ? 'By ' + t.boat_label : ''].filter(Boolean).join(' · ')));
    hero.appendChild(head);
    box.appendChild(hero);

    var main = el('div', 'wrap g-place');
    var left = el('div', 'g-place-main');
    var offer = G.tourOffer(t, today);
    if (offer) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(G.str(t.offer_until));
      left.appendChild(add(el('div', 'g-notice promo'), el('strong', null, offer),
        m ? el('p', null, 'Until ' + G.MONTHS[+m[2] - 1].slice(0, 3) + ' ' + (+m[3])) : null));
    }
    if ((t.expect || []).length) {
      var ex = el('ul', 'g-tips');
      t.expect.forEach(function (e) { ex.appendChild(el('li', null, e)); });
      add(left, el('h2', 'g-h3', 'What to expect'), ex);
    }
    var stops = el('ol', 'g-stops');
    (t.stops || []).filter(function (s) { return s && G.str(s.name); }).forEach(function (s) {
      var li = el('li', 'g-stop');
      var place = s.place_id ? places.filter(function (p) { return p.id === s.place_id; })[0] : null;
      var name = place ? link('place.html?id=' + encodeURIComponent(place.id), 'g-stop-name', s.name) : el('span', 'g-stop-name', s.name);
      add(li, name, s.minutes ? el('span', 'g-muted', s.minutes + ' min') : null);
      stops.appendChild(li);
    });
    add(left, el('h2', 'g-h3', 'Stops'), stops);
    if (G.str(t.bring)) add(left, el('h2', 'g-h3', 'What to bring'), el('p', null, G.str(t.bring)));
    if (G.str(t.notes)) add(left, el('h2', 'g-h3', 'Good to know'), el('p', null, G.str(t.notes)));

    var side = el('aside', 'g-place-side');
    var facts = el('dl', 'g-facts');
    [['Price', G.tourPrice(t)], ['Duration', t.duration_hours ? 'About ' + t.duration_hours + ' hours' : ''],
      ['When', G.tourMonths(t)], ['Starts at', G.str(t.start_label)], ['Boat', G.str(t.boat_label)]]
      .forEach(function (f) { if (f[1]) add(facts, el('dt', null, f[0]), el('dd', null, f[1])); });
    side.appendChild(facts);
    var inc = G.tourIncluded(t);
    if (inc.length) {
      var chips = el('div', 'g-inc');
      inc.forEach(function (i) { chips.appendChild(el('span', 'g-pill', i)); });
      add(side, el('h2', 'g-h3', 'Included'), chips);
    }
    var contact = el('div', 'g-calls');
    if (t.phone) contact.appendChild(telLink(t.phone));
    var msg = G.safeUrl(t.messenger) || (G.str(t.messenger) && !/\s/.test(t.messenger) ? 'https://m.me/' + encodeURIComponent(G.str(t.messenger).replace(/^@/, '')) : null);
    if (msg) { var ml = link(msg, 'g-call', 'Message'); ml.target = '_blank'; ml.rel = 'noopener noreferrer'; contact.appendChild(ml); }
    add(side, el('h2', 'g-h3', 'Book with the boatman'), G.str(t.operator) ? el('p', null, G.str(t.operator)) : null,
      contact.childNodes.length ? contact : el('p', 'g-muted', 'Ask at the banka landing or the Tourism Office.'),
      el('p', 'g-muted', 'Adventure doesn’t take bookings. Prices and stops can change with the weather.'));
    add(main, left, side);
    box.appendChild(main);
  }

  function islandHoppingPage(box) {
    var id = param('id'), town = param('town');
    loading(box);
    Promise.all([list('island_hopping_tours'), list('places', LIST_FIELDS).catch(function () { return []; })]).then(function (r) {
      box.textContent = '';
      var tours = G.toursShown(r[0]);
      if (id) {
        var t = tours.filter(function (x) { return x.id === id; })[0];
        if (!t) { state(box, 'This tour isn’t listed', 'It may have been removed.'); return; }
        // The tour has its own header; the list's header goes.
        var intro = document.querySelector('body > .g-place-hero');
        if (intro) intro.remove();
        tourDetail(box, t, r[1]);
        return;
      }
      setMeta('Island hopping in Romblon', 'Banka tours to Romblon’s beaches, sandbars and islands: stops, prices, what’s included and who to contact.');
      var page = el('div', 'wrap');
      var towns = G.TOWNS.filter(function (x) { return G.toursShown(tours, x).length; });
      if (towns.length > 1) {
        var chips = el('nav', 'g-towns'); chips.setAttribute('aria-label', 'Towns');
        var all = link('island-hopping.html', 'g-chip', 'All towns');
        if (!town) all.setAttribute('aria-current', 'page');
        chips.appendChild(all);
        towns.forEach(function (x) {
          var a = link('island-hopping.html?town=' + encodeURIComponent(x), 'g-chip', x);
          if (G.sameTown(x, town)) a.setAttribute('aria-current', 'page');
          chips.appendChild(a);
        });
        page.appendChild(chips);
      }
      page.appendChild(add(section(town ? 'Island hopping in ' + town : 'All tours', 'Contact the boatman to book — Adventure takes no bookings.'),
        tourGrid(G.toursShown(tours, town), 'Island hopping tours are being added. Check back soon.')));
      box.appendChild(page);
    }).catch(function () { failed(box); });
  }

  function pasalubongCard(p) {
    var c = el('article', 'g-card g-pasa');
    var media = el('div', 'g-card-media');
    var ph = (p.photos || []).map(function (x) { return G.safeUrl(x && x.url); }).filter(Boolean)[0];
    if (ph) media.appendChild(img(ph, ''));
    media.appendChild(el('span', 'g-flag', G.pasalubongKind(p)));
    var body = el('div', 'g-card-body');
    add(body, el('h3', 'g-card-title', p.name),
      el('p', 'g-card-meta', [p.category, p.municipality].filter(Boolean).join(' · ')),
      (p.products || []).length ? el('p', 'g-muted', (p.products || []).slice(0, 6).join(', ')) : null);
    var calls = el('div', 'g-calls');
    var phone = G.pasalubongPhone(p);
    if (phone) calls.appendChild(telLink(phone));
    if (p.placeId) calls.appendChild(link('place.html?id=' + encodeURIComponent(p.placeId), 'g-call', 'See place'));
    else if (typeof p.lat === 'number' && typeof p.lng === 'number') {
      var map = link('https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lng, 'g-call', 'Map');
      map.target = '_blank'; map.rel = 'noopener noreferrer';
      calls.appendChild(map);
    }
    if (calls.childNodes.length) body.appendChild(calls);
    add(c, media, body);
    return c;
  }

  function pasalubongPage(box) {
    var f = { town: param('town'), kind: param('kind'), q: param('q') };
    loading(box);
    setMeta('Pasalubong from Romblon', 'Local delicacies, marble crafts and handwoven goods from Romblon’s makers and pasalubong centers.');
    publishedPasalubong().then(function (all) {
      box.textContent = '';
      var page = el('div', 'wrap');
      var form = el('form', 'g-filters');
      form.action = 'pasalubong.html';
      var q = el('input', 'g-input'); q.type = 'search'; q.name = 'q'; q.value = f.q; q.placeholder = 'Search mazapan, marble, banig…';
      q.setAttribute('aria-label', 'Search pasalubong');
      var t = el('select', 'g-input'); t.name = 'town'; t.setAttribute('aria-label', 'Town');
      t.appendChild(new Option('All towns', ''));
      G.TOWNS.forEach(function (x) { t.appendChild(new Option(x, x, false, x === f.town)); });
      var k = el('select', 'g-input'); k.name = 'kind'; k.setAttribute('aria-label', 'Makers or centers');
      [['', 'Makers and centers'], ['maker', 'Makers'], ['center', 'Pasalubong centers']].forEach(function (o) { k.appendChild(new Option(o[1], o[0], false, o[0] === f.kind)); });
      t.onchange = k.onchange = function () { form.submit(); };
      var go = el('button', 'btn btn-sm', 'Search'); go.type = 'submit';
      add(form, q, t, k, go);
      var found = G.pasalubongShown(all, f);
      var g = el('div', 'g-grid');
      found.forEach(function (p) { g.appendChild(pasalubongCard(p)); });
      add(page, form, el('p', 'g-count', found.length + (found.length === 1 ? ' maker or center' : ' makers and centers')),
        found.length ? g : el('p', 'g-empty', all.length ? 'Nothing matches. Try another town or word.' : 'Pasalubong makers are being added. Check back soon.'));
      box.appendChild(page);
    }).catch(function () { failed(box); });
  }

  // ── Pages ───────────────────────────────────────────────────────────
  var CAT_ICON = {
    'Tourist Spot': 'beach_access', 'Food & Dining': 'restaurant', 'Accommodation': 'hotel',
    'Shopping': 'shopping_bag', 'Entertainment': 'attractions', 'Services': 'storefront'
  };

  function exploreHref(f) {
    var q = [];
    ['q', 'cat', 'town'].forEach(function (k) { if (f[k]) q.push(k + '=' + encodeURIComponent(f[k])); });
    return 'explore.html' + (q.length ? '?' + q.join('&') : '');
  }

  function explorePage(box) {
    var f = { town: param('town'), cat: param('cat'), q: param('q') };
    var filtered = !!(f.town || f.cat || f.q);
    loading(box);
    list('places', LIST_FIELDS).then(function (places) {
      box.textContent = '';
      var page = el('div', 'wrap');

      // Search: one big box.
      var form = el('form', 'g-search');
      form.setAttribute('role', 'search');
      form.action = 'explore.html';
      var input = el('input', 'g-search-input');
      input.type = 'search'; input.name = 'q'; input.value = f.q;
      input.placeholder = 'Search beaches, falls, food, resorts…';
      input.setAttribute('aria-label', 'Search places');
      if (f.cat) { var hc = el('input'); hc.type = 'hidden'; hc.name = 'cat'; hc.value = f.cat; form.appendChild(hc); }
      if (f.town) { var ht = el('input'); ht.type = 'hidden'; ht.name = 'town'; ht.value = f.town; form.appendChild(ht); }
      var go = el('button', 'btn btn-sm', 'Search'); go.type = 'submit';
      add(form, icon('search'), input, go);
      page.appendChild(form);

      // Categories with counts.
      var counts = G.countBy(places, 'category');
      var total = places.filter(G.isPublic).length;
      var cats = el('nav', 'g-cats');
      cats.setAttribute('aria-label', 'Categories');
      var all = link(exploreHref({ q: f.q, town: f.town }), 'g-cat');
      add(all, icon('apps'), el('span', 'g-cat-name', 'Everything'), el('span', 'g-cat-n', String(total)));
      if (!f.cat) all.setAttribute('aria-current', 'page');
      cats.appendChild(all);
      G.CATEGORIES.forEach(function (c) {
        if (!counts[c.id]) return;
        var a = link(exploreHref({ q: f.q, town: f.town, cat: c.id }), 'g-cat');
        add(a, icon(CAT_ICON[c.id] || 'place'), el('span', 'g-cat-name', c.label), el('span', 'g-cat-n', String(counts[c.id])));
        if (f.cat === c.id) a.setAttribute('aria-current', 'page');
        cats.appendChild(a);
      });
      page.appendChild(cats);

      var catLabel = f.cat ? (G.CATEGORIES.filter(function (c) { return c.id === f.cat; })[0] || {}).label : '';
      setMeta(catLabel || f.town ? [catLabel, f.town].filter(Boolean).join(' in ') + ' — Romblon' : 'Explore Romblon',
        'Tourist spots, food, places to stay and things to do in ' + (f.town || 'Romblon') + ', Philippines.');

      if (!filtered) {
        var must = places.filter(G.isPublic).filter(function (p) { return p.isMustVisit; });
        if (must.length) page.appendChild(add(section('Must visit', 'The places travelers shouldn’t miss.'), grid(G.filterPlaces(must, {}).slice(0, 8))));

        var byTown = G.countBy(places, 'municipality');
        var towns = section('Explore by town', 'Seventeen towns on seven islands.');
        var chips = el('div', 'g-town-chips');
        G.TOWNS.forEach(function (t) {
          var n = byTown[t] || 0;
          var a = link('town.html?name=' + encodeURIComponent(t), 'g-chip');
          add(a, document.createTextNode(t), n ? el('span', 'g-chip-n', String(n)) : null);
          chips.appendChild(a);
        });
        add(towns, chips, link('towns.html', 'g-more', 'See all towns →'));
        page.appendChild(towns);
      }

      // Results (or every place).
      var found = G.filterPlaces(places, f);
      var results = section(filtered ? 'Results' : 'All places');
      var bar = el('div', 'g-results-bar');
      var townSel = el('select', 'g-input');
      townSel.setAttribute('aria-label', 'Town');
      townSel.appendChild(new Option('All towns', ''));
      G.TOWNS.forEach(function (t) { townSel.appendChild(new Option(t, t, false, t === f.town)); });
      townSel.onchange = function () { location.href = exploreHref({ q: f.q, cat: f.cat, town: townSel.value }); };
      add(bar, el('p', 'g-count', found.length + (found.length === 1 ? ' place' : ' places') +
        (filtered ? ' · ' + [f.q && '“' + f.q + '”', catLabel, f.town].filter(Boolean).join(' · ') : '')), townSel,
        filtered ? link('explore.html', 'g-clear', 'Clear filters') : null);
      add(results, bar, grid(found, 'No places match. Try another word, town or category.'));
      page.appendChild(results);
      box.appendChild(page);
    }).catch(function () { failed(box); });
  }

  function townsPage(box) {
    loading(box);
    setMeta('Towns of Romblon', 'The 17 towns of Romblon on Tablas, Romblon Island, Sibuyan, Carabao and more — their places, ferries and events.');
    Promise.all([list('places', LIST_FIELDS), list('terminals').catch(function () { return []; })]).then(function (r) {
      var places = r[0], terminals = r[1];
      box.textContent = '';
      var page = el('div', 'wrap');
      G.townsByIsland().forEach(function (g) {
        var s = section(g.island);
        var gridEl = el('div', 'g-grid g-town-grid');
        g.towns.forEach(function (t) {
          var mine = G.filterPlaces(places, { town: t });
          var cover = mine.map(function (p) { return G.photos(p)[0]; }).filter(Boolean)[0];
          var ports = terminals.filter(function (x) { return G.sameTown(x.municipality, t); }).length;
          var a = link('town.html?name=' + encodeURIComponent(t), 'g-card g-town-card');
          var media = el('div', 'g-card-media');
          if (cover) media.appendChild(img(cover, ''));
          media.appendChild(el('span', 'g-town-name', t));
          var body = el('div', 'g-card-body');
          body.appendChild(el('p', 'g-card-meta', [mine.length ? mine.length + (mine.length === 1 ? ' place' : ' places') : 'Places coming soon',
            ports ? ports + (ports === 1 ? ' port' : ' ports') : ''].filter(Boolean).join(' · ')));
          add(a, media, body);
          gridEl.appendChild(a);
        });
        s.appendChild(gridEl);
        page.appendChild(s);
      });
      box.appendChild(page);
    }).catch(function () { failed(box); });
  }

  function placePage(box) {
    var id = param('id');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) { state(box, 'No place here', 'This link is missing its place.'); return; }
    loading(box);
    getDoc('places', id).then(function (p) {
      if (!p || !G.isPublic(p)) { state(box, 'This place isn’t listed', 'It may have been removed.'); return; }
      box.textContent = '';
      var today = new Date();
      var pics = G.photos(p);
      var desc = G.str(p.summary) || G.str(p.about);
      setMeta(p.name + ', ' + (p.municipality || 'Romblon'), desc || ('Visit ' + p.name + ' in Romblon.'));

      var hero = el('header', 'g-place-hero');
      if (pics[0]) hero.appendChild(img(pics[0], p.name, 'g-place-cover'));
      var head = el('div', 'wrap g-place-head');
      var crumbs = el('nav', 'g-crumbs'); crumbs.setAttribute('aria-label', 'Breadcrumb');
      add(crumbs, link('explore.html', null, 'Explore'), document.createTextNode(' / '),
        p.municipality ? link('town.html?name=' + encodeURIComponent(p.municipality), null, p.municipality) : null);
      add(head, crumbs, el('h1', 'g-h1', p.name),
        el('p', 'g-sub', [p.placeType || p.category, p.barangay ? 'Brgy. ' + p.barangay : '', p.municipality].filter(Boolean).join(' · ')));
      hero.appendChild(head);
      box.appendChild(hero);

      var main = el('div', 'wrap g-place');
      var left = el('div', 'g-place-main');
      var closed = G.closedLabel(p, today), promo = G.promoText(p, today);
      if (closed) left.appendChild(add(el('div', 'g-notice closed'), el('strong', null, closed), p.closedNote ? el('p', null, p.closedNote) : null));
      if (promo) left.appendChild(add(el('div', 'g-notice promo'), el('strong', null, promo)));
      if (p.about || p.summary) left.appendChild(el('p', 'g-lead', G.str(p.about) || G.str(p.summary)));
      if (pics.length > 1) {
        var gal = el('div', 'g-gallery');
        pics.slice(1, 9).forEach(function (u) { gal.appendChild(img(u, '')); });
        left.appendChild(gal);
      }
      if (G.str(p.howToGetThere)) add(left, el('h2', 'g-h3', 'How to get there'), el('p', null, G.str(p.howToGetThere)));
      var tips = (p.tips || []).map(G.str).filter(Boolean);
      if (tips.length) {
        var ul = el('ul', 'g-tips');
        tips.forEach(function (t) { ul.appendChild(el('li', null, t)); });
        add(left, el('h2', 'g-h3', 'Traveler tips'), ul);
      }
      if (typeof p.latitude === 'number' && typeof p.longitude === 'number' && (p.latitude || p.longitude)) {
        var map = link('https://www.google.com/maps/search/?api=1&query=' + p.latitude + ',' + p.longitude, 'btn btn-ghost btn-sm', 'Open in Google Maps');
        map.target = '_blank'; map.rel = 'noopener noreferrer';
        left.appendChild(map);
      }

      var side = el('aside', 'g-place-side');
      var facts = el('dl', 'g-facts');
      [['Hours', G.hoursText(p)], [p.category === 'Accommodation' ? 'Rates' : p.category === 'Tourist Spot' ? 'Entrance fee' : 'Prices', G.priceText(p)],
        ['Check-in', p.category === 'Accommodation' ? G.str(p.checkInTime) : ''], ['Check-out', p.category === 'Accommodation' ? G.str(p.checkOutTime) : ''],
        ['Address', G.str(p.location)], ['Best time to visit', G.str(p.bestTimeToVisit)]]
        .forEach(function (f) { if (f[1]) add(facts, el('dt', null, f[0]), el('dd', null, f[1])); });
      side.appendChild(facts);
      var contact = el('div', 'g-calls');
      if (p.phoneNumber) contact.appendChild(telLink(p.phoneNumber));
      var msg = G.safeUrl(p.messengerLink) || (G.str(p.messengerLink) && !/\s/.test(p.messengerLink) ? 'https://m.me/' + encodeURIComponent(G.str(p.messengerLink).replace(/^@/, '')) : null);
      if (msg) { var m = link(msg, 'g-call', 'Message'); m.target = '_blank'; m.rel = 'noopener noreferrer'; contact.appendChild(m); }
      var web = G.safeUrl(p.website);
      if (web) { var wl = link(web, 'g-call', 'Website'); wl.target = '_blank'; wl.rel = 'noopener noreferrer'; contact.appendChild(wl); }
      if (contact.childNodes.length) add(side, el('h2', 'g-h3', 'Contact'), contact,
        el('p', 'g-muted', 'Adventure doesn’t take bookings — contact them directly.'));
      if (p.partnerUpdatedAt) side.appendChild(el('p', 'g-muted', 'Updated by the owner'));
      add(main, left, side);
      box.appendChild(main);

      list('island_hopping_tours').then(function (tours) {
        var here = G.toursForPlace(G.toursShown(tours), p.id);
        if (!here.length) return;
        var s = section('Island hopping', here.length === 1 ? 'A banka tour that goes here.' : here.length + ' banka tours go here.');
        s.classList.add('wrap');
        s.appendChild(tourGrid(here));
        box.insertBefore(s, box.querySelector('.g-section.wrap'));
      }).catch(function () { /* optional */ });
      if (p.municipality) {
        list('places', LIST_FIELDS).then(function (all) {
          var near = G.filterPlaces(all, { town: p.municipality }).filter(function (x) { return x.id !== p.id; }).slice(0, 6);
          if (!near.length) return;
          var s = section('More in ' + p.municipality);
          s.classList.add('wrap');
          s.appendChild(grid(near));
          box.appendChild(s);
        }).catch(function () { /* optional */ });
      }
    }).catch(function () { failed(box); });
  }

  function townPage(box) {
    var town = G.TOWNS.filter(function (t) { return G.sameTown(t, param('name') || PILOT); })[0];
    if (!town) { state(box, 'Town not found', 'Pick a town from Explore.'); return; }
    loading(box);
    Promise.all([
      list('places', LIST_FIELDS), list('terminals'),
      list('boat_routes').catch(function () { return []; }), list('fare_guides').catch(function () { return []; }),
      list('hotlines').catch(function () { return []; }), list('events').catch(function () { return []; }),
      list('island_hopping_tours').catch(function () { return []; }), publishedPasalubong().catch(function () { return []; })
    ]).then(function (r) {
      var places = r[0], terminals = r[1], boats = r[2], fares = r[3], hotlines = r[4], events = r[5];
      box.textContent = '';
      setMeta(town + ', Romblon', 'Tourist spots, food, places to stay, ferries and events in ' + town + ', Romblon, Philippines.');
      var mine = G.filterPlaces(places, { town: town });
      var cover = mine.map(function (p) { return G.photos(p)[0]; }).filter(Boolean)[0];
      var hero = el('header', 'g-town-hero');
      if (cover) hero.appendChild(img(cover, town, 'g-place-cover'));
      add(hero, add(el('div', 'wrap g-place-head'), el('span', 'g-kicker light', 'Romblon, Philippines'), el('h1', 'g-h1', town),
        el('p', 'g-sub', mine.length + ' places to see, eat and stay')));
      box.appendChild(hero);

      var page = el('div', 'wrap');
      var picker = el('nav', 'g-towns'); picker.setAttribute('aria-label', 'Towns');
      G.TOWNS.forEach(function (t) {
        var a = link('town.html?name=' + encodeURIComponent(t), 'g-chip', t);
        if (t === town) a.setAttribute('aria-current', 'page');
        picker.appendChild(a);
      });
      page.appendChild(picker);
      requestAnimationFrame(function () {
        var cur = picker.querySelector('[aria-current]');
        if (cur) picker.scrollLeft = cur.offsetLeft - picker.offsetLeft - 16;
      });

      G.CATEGORIES.forEach(function (c) {
        var items = mine.filter(function (p) { return p.category === c.id; });
        if (!items.length) return;
        var s = section(c.label);
        s.appendChild(grid(items.slice(0, 8)));
        if (items.length > 8) s.appendChild(link('explore.html?town=' + encodeURIComponent(town) + '&cat=' + encodeURIComponent(c.id), 'g-more', 'See all ' + items.length));
        page.appendChild(s);
      });
      if (!mine.length) page.appendChild(el('p', 'g-empty', 'Places in ' + town + ' are being added. Check back soon.'));

      var ports = terminals.filter(function (t) { return G.sameTown(t.municipality, town); });
      var routes = G.ferryRoutes(ports);
      var townBoats = G.boatsIn(boats, town), townFares = G.faresIn(fares, town);
      if (routes.length || townBoats.length || townFares.length) {
        var g = section('Getting there and around', 'Fares and trips change with the season and weather — confirm with the operator.');
        if (routes.length) add(g, el('h3', 'g-h3', 'Ferries from ' + ports.map(function (p) { return p.name; }).join(', ')), routeList(routes));
        if (townBoats.length) add(g, el('h3', 'g-h3', 'Banka & pumpboat'), boatList(townBoats));
        if (townFares.length) add(g, el('h3', 'g-h3', 'Tricycle fares'), fareTable(townFares));
        page.appendChild(g);
      }

      var townTours = G.toursShown(r[6], town);
      if (townTours.length) page.appendChild(add(section('Island hopping', 'Banka tours from ' + town + '.'), tourGrid(townTours)));
      var townPasa = G.pasalubongShown(r[7], { town: town });
      if (townPasa.length) {
        var pg = el('div', 'g-grid');
        townPasa.slice(0, 8).forEach(function (p) { pg.appendChild(pasalubongCard(p)); });
        page.appendChild(add(section('Pasalubong', 'Local products to bring home.'), pg,
          townPasa.length > 8 ? link('pasalubong.html?town=' + encodeURIComponent(town), 'g-more', 'See all ' + townPasa.length) : null));
      }
      var ev = G.eventsByMonth(events, new Date().getMonth() + 1, town);
      if (ev.length) page.appendChild(add(section('Fiestas and events'), eventList(ev)));
      page.appendChild(add(section('Emergency hotlines', 'Tap a number to call from your phone.'), hotlineList(hotlines, town)));
      box.appendChild(page);
    }).catch(function () { failed(box); });
  }

  // ── Departures board (a port, like the board at the terminal) ──────
  function departures(terminals, statuses) {
    var ports = G.boardPorts(terminals);
    var s = section('Departures', 'Pick a port to see what leaves from it. Times can change — check with the shipping line before you travel.');
    if (!ports.length) { s.appendChild(el('p', 'g-empty', 'Ferry schedules are being added.')); return s; }
    var want = param('port');
    var port = (ports.filter(function (p) { return p.name === want; })[0] ||
      ports.filter(function (p) { return /san agustin/i.test(p.name); })[0] || ports[0]).name;
    var todayOnly = param('all') !== '1';

    var bar = el('div', 'g-board-bar');
    var sel = el('select', 'g-input'); sel.setAttribute('aria-label', 'Port');
    ports.forEach(function (p) { sel.appendChild(new Option(p.name + (p.town ? ' · ' + p.town : ''), p.name, false, p.name === port)); });
    var seg = el('div', 'g-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Which sailings');
    var bToday = el('button', 'g-seg-opt', 'Today'); bToday.type = 'button';
    var bAll = el('button', 'g-seg-opt', 'All week'); bAll.type = 'button';
    add(seg, bToday, bAll);
    add(bar, sel, seg);

    var board = el('div', 'g-board');
    function draw() {
      bToday.setAttribute('aria-pressed', todayOnly ? 'true' : 'false');
      bAll.setAttribute('aria-pressed', todayOnly ? 'false' : 'true');
      var url = 'routes.html?port=' + encodeURIComponent(port) + (todayOnly ? '' : '&all=1');
      try { history.replaceState(null, '', url); } catch (e) { /* file:// */ }
      board.textContent = '';
      var now = new Date();
      var manila = new Date(now.getTime() + 8 * 3600e3);
      var dateText = G.MONTHS[manila.getUTCMonth()].slice(0, 3) + ' ' + manila.getUTCDate();
      var head = el('div', 'g-board-head');
      add(head, el('span', 'g-board-title', 'Departures'), el('span', 'g-board-port', port),
        el('span', 'g-board-date', todayOnly ? G.manilaWeekday(now) + ' · ' + dateText : 'All week'));
      board.appendChild(head);
      var rows = G.portBoard(terminals, statuses, port, todayOnly, now);
      if (!rows.length) {
        board.appendChild(el('p', 'g-board-empty', todayOnly ? 'No sailings listed for today from this port. Try “All week”.' : 'No sailings listed from this port yet.'));
        return;
      }
      var cols = el('div', 'g-board-row g-board-cols');
      ['Time', 'Destination', 'Vessel', todayOnly ? 'Line' : 'Days', 'Status'].forEach(function (c) { cols.appendChild(el('span', null, c)); });
      board.appendChild(cols);
      rows.forEach(function (x) {
        var row = el('div', 'g-board-row' + (x.status ? ' ' + x.status : ''));
        var status = x.status === 'paused' ? x.pause
          : x.status === 'cancelled' ? 'Cancelled' + (x.resume ? ' · ' + x.resume : '')
            : x.status === 'delayed' ? 'Delayed' + (x.newTime ? ' → ' + x.newTime : '') + (x.resume ? ' · ' + x.resume : '') : 'On schedule';
        var st = el('span', 'g-board-status ' + (x.status || 'ok'), status);
        if (x.reason) st.title = x.reason;
        add(row,
          el('span', 'g-board-time', x.time),
          el('span', 'g-board-to', x.to),
          el('span', 'g-board-vessel', [x.vessel || x.operator, x.type].filter(Boolean).join(' · ')),
          el('span', 'g-board-days', todayOnly ? (x.vessel ? x.operator : '') : x.days),
          st);
        board.appendChild(row);
        if (x.reason && x.status) board.appendChild(el('p', 'g-board-reason', x.reason));
      });
    }
    sel.onchange = function () { port = sel.value; draw(); };
    bToday.onclick = function () { todayOnly = true; draw(); };
    bAll.onclick = function () { todayOnly = false; draw(); };
    draw();
    add(s, bar, board);
    return s;
  }

  function routesPage(box) {
    loading(box);
    setMeta('Ferries & routes in Romblon', 'Ferry routes and schedules between Romblon’s islands, live delays and cancellations, banka trips and tricycle fares.');
    Promise.all([
      list('terminals'), list('route_status').catch(function () { return []; }),
      list('boat_routes').catch(function () { return []; }), list('fare_guides').catch(function () { return []; }),
      list('hotlines').catch(function () { return []; })
    ]).then(function (r) {
      var adv = G.activeAdvisories(r[1]), boats = r[2], fares = r[3];
      box.textContent = '';
      var page = el('div', 'wrap');
      var live = section('Live status', adv.length ? 'Delays and cancellations posted by the ports.' : '');
      if (adv.length) live.appendChild(advisoryList(adv));
      else live.appendChild(el('p', 'g-ok', 'No delays or cancellations posted right now.'));
      page.appendChild(live);

      page.appendChild(departures(r[0], r[1]));

      var towns = G.TOWNS.filter(function (t) { return G.boatsIn(boats, t).length || G.faresIn(fares, t).length; });
      if (towns.length) {
        var local = section('Bankas and tricycle fares', 'Contact the boatman or driver directly — Adventure takes no bookings.');
        towns.forEach(function (t) {
          add(local, el('h3', 'g-h3', t));
          if (G.boatsIn(boats, t).length) local.appendChild(boatList(G.boatsIn(boats, t)));
          if (G.faresIn(fares, t).length) local.appendChild(fareTable(G.faresIn(fares, t)));
        });
        page.appendChild(local);
      }
      page.appendChild(add(section('Emergency hotlines', 'Province-wide numbers. Each town page has its own.'), hotlineList(r[4], '')));
      box.appendChild(page);
    }).catch(function () { failed(box); });
  }

  function eventsPage(box) {
    loading(box);
    setMeta('Fiestas and events in Romblon', 'Romblon’s town fiestas and events through the year: Biniray, Kanidugan and more.');
    list('events').then(function (events) {
      box.textContent = '';
      var page = el('div', 'wrap');
      var groups = G.eventsByMonth(events, new Date().getMonth() + 1, '');
      page.appendChild(groups.length ? eventList(groups) : el('p', 'g-empty', 'Events are being added. Check back soon.'));
      box.appendChild(page);
    }).catch(function () { failed(box); });
  }

  // ── Start ───────────────────────────────────────────────────────────
  frame();
  var box = document.getElementById('guide');
  var pages = { explore: explorePage, towns: townsPage, place: placePage, town: townPage, routes: routesPage, events: eventsPage,
    islandHopping: islandHoppingPage, pasalubong: pasalubongPage };
  if (box && pages[document.body.dataset.page]) pages[document.body.dataset.page](box);
})();
