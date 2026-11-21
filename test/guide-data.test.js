// node --test test/  — the website guide's data helpers.
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/guide-data.js');

test('Firestore REST documents decode to plain data with an id', () => {
  const d = G.docOf({
    name: 'projects/x/databases/(default)/documents/places/p1',
    fields: {
      name: { stringValue: 'Bonbon Beach' },
      rating: { doubleValue: 4.5 },
      capacity: { integerValue: '20' },
      isFeatured: { booleanValue: true },
      images: { arrayValue: { values: [{ mapValue: { fields: { url: { stringValue: 'https://a/1.jpg' } } } }] } },
      none: { nullValue: null },
    },
  });
  assert.equal(d.id, 'p1');
  assert.equal(d.capacity, 20);
  assert.equal(d.isFeatured, true);
  assert.deepEqual(d.images, [{ url: 'https://a/1.jpg' }]);
  assert.equal(d.none, null);
});

const places = [
  { id: 'a', name: 'Cantingas River', category: 'Tourist Spot', municipality: 'San Jose' },
  { id: 'b', name: 'Bonbon Beach', category: 'Tourist Spot', municipality: 'Romblon', isMustVisit: true },
  { id: 'c', name: 'Bonbon Cafe', category: 'Food & Dining', municipality: 'Romblon', placeType: 'Café' },
  { id: 'd', name: '', category: 'Tourist Spot', municipality: 'Romblon' },
  { id: 'e', name: 'Hidden', category: 'Tourist Spot', municipality: 'Romblon', reviewStatus: 'pending' },
];

test('places filter by town, category and words; must-visit first; hidden ones left out', () => {
  assert.deepEqual(G.filterPlaces(places, {}).map((p) => p.id), ['b', 'c', 'a']);
  assert.deepEqual(G.filterPlaces(places, { town: 'romblon' }).map((p) => p.id), ['b', 'c']);
  assert.deepEqual(G.filterPlaces(places, { cat: 'Food & Dining' }).map((p) => p.id), ['c']);
  assert.deepEqual(G.filterPlaces(places, { q: 'bonbon cafe' }).map((p) => p.id), ['c']);
  assert.deepEqual(G.filterPlaces(places, { q: 'river' }).map((p) => p.id), ['a']);
});

test('photos: https only, main first, no repeats', () => {
  assert.deepEqual(G.photos({
    image: 'https://a/1.jpg',
    images: [{ url: 'https://a/1.jpg' }, 'https://a/2.jpg', 'javascript:alert(1)', { url: 'http://insecure' }],
  }), ['https://a/1.jpg', 'https://a/2.jpg']);
});

test('owner info: closed today / until a day / an old closure; promos until their day', () => {
  const today = new Date(2026, 10, 20, 10);
  assert.equal(G.closedLabel({ closedUntil: '2026-11-20' }, today), 'Closed today');
  assert.equal(G.closedLabel({ closedUntil: '2026-11-24' }, today), 'Closed until Nov 24');
  assert.equal(G.closedLabel({ closedUntil: '2026-11-19' }, today), '');
  assert.equal(G.promoText({ promoText: 'Free coffee', promoUntil: '2026-11-30' }, today), 'Free coffee');
  assert.equal(G.promoText({ promoText: 'Old', promoUntil: '2026-11-01' }, today), '');
});

test('hours and prices read the way travelers expect', () => {
  assert.equal(G.hoursText({ hours: '8 AM - 5 PM' }), '8 AM - 5 PM');
  assert.equal(G.hoursText({ daySchedules: [{ days: ['Monday', 'Tuesday'], open: '8:00 AM', close: '5:00 PM' }] }),
    'Mon, Tue 8:00 AM – 5:00 PM');
  assert.equal(G.priceText({ category: 'Accommodation', roomPriceFrom: 1500, roomPriceTo: 3000 }), '₱1,500 – ₱3,000 a night');
  assert.equal(G.priceText({ category: 'Tourist Spot', entryFee: '₱20' }), '₱20');
  assert.equal(G.priceText({ category: 'Food & Dining', priceRange: '₱80–₱250' }), '₱80–₱250');
});

test('ferry routes from every port, with their sailing days and times', () => {
  const routes = G.ferryRoutes([{
    name: 'Ambulong Port', municipality: 'Magdiwang',
    ferries: [{
      name: 'Starlite Ferries', vesselName: 'Starlite',
      routes: [
        { id: 'r2', from: 'Ambulong Port', to: 'Romblon Port', daySchedules: [{ open: '07:00 PM', closed: false, days: ['Sunday', 'Tuesday', 'Thursday', 'Saturday'] }] },
        { id: 'r1', from: 'Ambulong Port', to: 'Batangas Port', daySchedules: [{ open: '', closed: true, days: ['Monday'] }] },
        { id: 'bad', from: '', to: 'X' },
      ],
    }],
  }]);
  assert.deepEqual(routes.map((r) => r.id), ['r1', 'r2']);
  assert.deepEqual(routes[1].sailings, [{ days: 'Tue, Thu, Sat, Sun', time: '07:00 PM' }]);
  assert.deepEqual(routes[0].sailings, []);
  assert.equal(routes[1].town, 'Magdiwang');
  assert.equal(G.daysText(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']), 'Daily');
});

test('live status: delays and cancellations until their last day (Manila time)', () => {
  const now = new Date('2026-11-20T02:00:00Z');
  const list = G.activeAdvisories([
    { status: 'cancelled', effectiveDate: '2026-11-20', untilDate: '2026-11-20' },
    { status: 'delayed', effectiveDate: '2026-11-18', untilDate: '2026-11-19' },
    { status: 'on_time', effectiveDate: '2026-11-20', untilDate: '2026-11-20' },
  ], now);
  assert.equal(list.length, 1);
  assert.equal(list[0].status, 'cancelled');
  assert.equal(G.manilaToday(new Date('2026-11-19T17:00:00Z')), '2026-11-20');
});

test('bankas, fares and hotlines for a town', () => {
  const b = { municipality: 'San Agustin', to_label: 'Romblon', service: 'BOTH', fare_per_person: 120, charter_price: 2500, charter_capacity: 10, days: [1, 3, 5], trips: ['7:00 AM'] };
  assert.deepEqual(G.boatsIn([b, { ...b, is_active: false }, { ...b, municipality: 'Looc' }], 'San Agustin').length, 1);
  assert.equal(G.boatFare(b), '₱120 per person · ₱2,500 for the boat (up to 10)');
  assert.equal(G.boatSchedule(b), 'Mon, Wed, Fri — 7:00 AM');
  const fares = G.faresIn([
    { municipality: 'San Agustin', from_kind: 'TOWN_CENTER', to_label: 'A' },
    { municipality: 'San Agustin', from_kind: 'PORT', to_label: 'B' },
  ], 'San Agustin');
  assert.deepEqual(fares.map((f) => f.to_label), ['B', 'A']);
  const h = G.hotlinesFor([
    { municipality: 'San Agustin', kind: 'TOURISM', name: 'Tourism', phones: ['0917'] },
    { municipality: 'San Agustin', kind: 'POLICE', name: 'PNP', phones: ['0918'] },
    { municipality: G.PROVINCE_WIDE, kind: 'COAST_GUARD', name: 'PCG', phones: ['0919'] },
    { municipality: 'San Agustin', kind: 'FIRE', name: 'No number', phones: [] },
  ], 'San Agustin');
  assert.deepEqual(h.map((x) => x.name), ['National emergency hotline', 'PNP', 'Tourism', 'PCG']);
  assert.equal(G.dialable('(042) 555-0101'), '0425550101');
});

test('events: when they happen and grouped by month from now', () => {
  assert.equal(G.eventWhen({ month: 5, day_start: 14, day_end: 16 }), 'May 14–16');
  assert.equal(G.eventWhen({ month: 1, day: 15 }), 'January 15');
  assert.equal(G.eventWhen({ month: 4 }), 'Every April');
  assert.equal(G.eventWhen({ one_time_date: '2026-12-08' }), 'December 8, 2026');
  const groups = G.eventsByMonth([
    { title: 'Biniray', month: 1, day: 9, municipality_name: 'Romblon' },
    { title: 'Kanidugan', month: 12, day: 2, municipality_name: 'San Agustin' },
    { title: 'Off', month: 12, is_active: false },
  ], 11);
  assert.deepEqual(groups.map((g) => g.name), ['December', 'January']);
  assert.deepEqual(G.eventsByMonth([{ title: 'Kanidugan', month: 12, municipality_name: 'San Agustin' }], 1, 'Romblon'), []);
});

test('towns are grouped by island, every town once', () => {
  assert.equal(G.islandOf('San Agustin'), 'Tablas');
  assert.equal(G.islandOf('Magdiwang'), 'Sibuyan');
  assert.equal(G.islandOf('Romblon'), 'Romblon Island');
  assert.equal(G.islandOf('San Jose'), 'Carabao');
  const groups = G.townsByIsland();
  assert.deepEqual(groups.map((g) => g.island), ['Tablas', 'Romblon Island', 'Sibuyan', 'Carabao', 'Banton, Simara & Maestre de Campo']);
  const all = groups.flatMap((g) => g.towns);
  assert.equal(all.length, 17);
  assert.equal(new Set(all).size, 17);
});

test('places counted by category and town (public ones only)', () => {
  const c = G.countBy(places, 'category');
  assert.equal(c['Tourist Spot'], 2);
  assert.equal(c['Food & Dining'], 1);
  assert.equal(G.countBy(places, 'municipality').Romblon, 2);
});

test('island hopping tours: shown ones, price, route, offer, by town', () => {
  const tours = [
    { id: 't1', name: 'Romblon island hopping', municipality: 'Romblon', stops: [{ name: 'Bonbon Beach', place_id: 'p1' }, { name: 'Bang-og Island' }],
      price_per_boat: 2500, capacity: 10, price_per_person: 350, duration_hours: 5, best_months: [12, 1],
      inclusions: ['life_vests', 'snorkel'], custom_inclusions: ['Tuba tasting'], offer_text: 'Free lunch', offer_until: '2026-12-31',
      expect: ['Swim at the sandbar'], boat_label: 'MB Lonos · Pumpboat / motorbanca' },
    { id: 't2', name: 'Hidden', municipality: 'Romblon', stops: [{ name: 'A' }, { name: 'B' }], is_active: false },
    { id: 't3', name: 'One stop', stops: [{ name: 'A' }] },
  ];
  const shown = G.toursShown(tours);
  assert.deepEqual(shown.map((t) => t.id), ['t1']);
  const t = shown[0];
  assert.equal(G.tourRoute(t), 'Bonbon Beach → Bang-og Island');
  assert.equal(G.tourPrice(t), '₱2,500 for the boat (up to 10) · ₱350 per person');
  assert.deepEqual(G.tourIncluded(t), ['Life vests', 'Snorkel gear', 'Tuba tasting']);
  assert.equal(G.tourMonths(t), 'Best Jan, Dec');
  assert.equal(G.tourOffer(t, new Date(2026, 10, 20)), 'Free lunch');
  assert.equal(G.tourOffer(t, new Date(2027, 0, 1)), '');
  assert.deepEqual(G.toursShown(tours, 'San Agustin'), []);
  assert.deepEqual(G.toursForPlace(shown, 'p1').map((x) => x.id), ['t1']);
});

test('pasalubong: makers and centers by town and category; contact only with consent', () => {
  const list = [
    { id: 'a', name: 'Lola Ising', kind: 'maker', municipality: 'Romblon', category: 'Food & Delicacies', products: ['Mazapan'], phone: '0917', contactConsent: false, published: true },
    { id: 'b', name: 'OTOP Hub Odiongan', kind: 'center', municipality: 'Odiongan', category: 'Handicrafts & Weaves', phone: '0918', contactConsent: true, published: true, featured: true },
    { id: 'c', name: 'Draft', published: false },
  ];
  assert.deepEqual(G.pasalubongShown(list, {}).map((x) => x.id), ['b', 'a']);
  assert.deepEqual(G.pasalubongShown(list, { town: 'Romblon' }).map((x) => x.id), ['a']);
  assert.deepEqual(G.pasalubongShown(list, { kind: 'center' }).map((x) => x.id), ['b']);
  assert.deepEqual(G.pasalubongShown(list, { q: 'mazapan' }).map((x) => x.id), ['a']);
  assert.equal(G.pasalubongPhone(list[0]), '');
  assert.equal(G.pasalubongPhone(list[1]), '0918');
  assert.equal(G.pasalubongKind(list[1]), 'Pasalubong center');
});

test('a port departures board: one row per sailing, by time, with live status', () => {
  const terminals = [{
    id: 't1', name: 'Romblon Port', municipality: 'Romblon',
    ferries: [
      { name: 'Starhorse Shipping Lines', vesselName: 'MV Starhorse 3', routes: [
        { id: 'r1', from: 'Romblon Port', to: 'San Agustin Port', daySchedules: [{ open: '08:00 AM', days: ['Friday', 'Monday'] }] },
        { id: 'r2', from: 'Romblon Port', to: 'Lucena Port', daySchedules: [{ open: '07:00 PM', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }, { open: '', closed: true, days: ['Sunday'] }] },
      ] },
      { name: 'Lonos Bangkero', vesselType: 'PUMPBOAT', routes: [{ id: 'r3', from: 'Romblon Port', to: 'Sibale', daySchedules: [{ open: '6:30 AM', days: ['Saturday'] }] }] },
    ],
  }, { id: 't2', name: 'Odiongan Port', ferries: [] }];
  const statuses = [{ routeId: 'r2', status: 'delayed', untilDate: '2026-11-20', newDepartureTime: '9:30 PM', reason: 'Late arrival' }];
  const fri = new Date('2026-11-20T02:00:00Z'); // Friday in Manila
  const all = G.portBoard(terminals, statuses, 'Romblon Port', false, fri);
  assert.deepEqual(all.map((r) => [r.time, r.to]), [['6:30 AM', 'Sibale'], ['08:00 AM', 'San Agustin Port'], ['07:00 PM', 'Lucena Port']]);
  assert.equal(all[0].type, 'Pumpboat / motorbanca');
  assert.equal(all[1].days, 'Mon, Fri');
  assert.equal(all[2].days, 'Daily');
  assert.equal(all[2].status, 'delayed');
  assert.equal(all[2].newTime, '9:30 PM');
  assert.equal(all[2].reason, 'Late arrival');
  const today = G.portBoard(terminals, statuses, 'Romblon Port', true, fri);
  assert.deepEqual(today.map((r) => r.to), ['San Agustin Port', 'Lucena Port']);
  assert.deepEqual(G.boardPorts(terminals).map((p) => p.name), ['Romblon Port']);
  assert.equal(G.manilaWeekday(fri), 'Friday');
});

test('resume dates: advisories say when, a paused vessel says not sailing', () => {
  assert.equal(G.resumeText('2026-11-25'), 'Resumes Nov 25');
  assert.equal(G.resumeText(''), '');
  const terminals = [{ id: 't1', name: 'Romblon Port', ferries: [
    { name: 'Starhorse', paused: { on: true, resumeDate: '2026-12-01', reason: 'Dry dock' },
      routes: [{ id: 'r1', from: 'Romblon Port', to: 'Lucena Port', daySchedules: [{ open: '07:00 PM', days: ['Friday'] }] }] },
    { name: 'Montenegro', paused: { on: true, resumeDate: '2026-11-20' },
      routes: [{ id: 'r2', from: 'Romblon Port', to: 'Batangas Port', daySchedules: [{ open: '08:00 PM', days: ['Friday'] }] }] },
  ] }];
  const rows = G.portBoard(terminals, [{ routeId: 'r2', status: 'cancelled', untilDate: '2026-11-21', resumeDate: '2026-11-22' }], 'Romblon Port', false, new Date('2026-11-21T02:00:00Z'));
  assert.equal(rows[0].status, 'paused');
  assert.equal(rows[0].pause, 'Not sailing · Resumes Dec 1');
  assert.equal(rows[0].reason, 'Dry dock');
  assert.equal(rows[1].status, 'cancelled');
  assert.equal(rows[1].resume, 'Resumes Nov 22');
});

test('a stopped vessel can say its new schedule', () => {
  const now = new Date('2026-11-21T02:00:00Z');
  assert.equal(G.pauseText({ paused: { on: true, resumeDate: '2026-12-01', newSchedule: 'Daily 7:00 AM' } }, now),
    'Not sailing · Resumes Dec 1 · New schedule: Daily 7:00 AM');
  assert.equal(G.pauseText({ paused: { on: true, newSchedule: 'Daily 7:00 AM' } }, now),
    'Not sailing until further notice · New schedule: Daily 7:00 AM');
});

test('schedule changes: text, which trips run, and the board', () => {
  const c = { routeId: 'r1', from: 'A Port', to: 'B Port', startDate: '2026-11-18', endDate: '2026-11-22', kind: 'afternoon', note: 'Per the operator' };
  assert.equal(G.changeText(c), 'Nov 18 – Nov 22 · Afternoon trips only · Per the operator');
  assert.equal(G.changeText({ ...c, endDate: '2026-11-18', kind: 'custom', times: ['7:00 AM'], note: '' }), 'Nov 18 · Trips at 7:00 AM');
  assert.equal(G.runsUnder(c, '1:00 PM'), true);
  assert.equal(G.runsUnder(c, '7:00 AM'), false);
  assert.equal(G.runsUnder({ kind: 'none' }, '7:00 AM'), false);
  const now = new Date('2026-11-20T02:00:00Z'); // Fri Nov 20 in Manila
  assert.equal(G.currentChanges([c, { ...c, startDate: '2026-11-01', endDate: '2026-11-02' }], now).length, 1);

  const terminals = [{ name: 'A Port', ferries: [{ name: 'MV Maria', routes: [{ id: 'r1', from: 'A Port', to: 'B Port',
    daySchedules: [{ days: [], open: '7:00 AM' }, { days: [], open: '1:00 PM' }] }] }] }];
  const rows = G.portBoard(terminals, [], 'A Port', true, now, [c]);
  assert.deepEqual(rows.map((r) => [r.time, r.status]), [['7:00 AM', 'changed-off'], ['1:00 PM', 'changed']]);
  const custom = G.portBoard(terminals, [], 'A Port', true, now, [{ ...c, kind: 'custom', times: ['9:00 AM'] }]);
  assert.deepEqual(custom.map((r) => [r.time, r.status]), [['9:00 AM', 'changed']]);
  // All week shows the usual schedule.
  assert.equal(G.portBoard(terminals, [], 'A Port', false, now, [c])[0].status, '');
});
