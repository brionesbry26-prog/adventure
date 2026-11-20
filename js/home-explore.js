/* =====================================================================
   Homepage › Explore Romblon: live counts on the shortcut tiles and four
   must-visit places from the guide's data. Quietly does nothing when
   offline: the tiles still link to the guide pages.
   ===================================================================== */
(function () {
  'use strict';
  var G = window.AdvGuide;
  if (!G || !window.fetch) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function list(col, mask) {
    var q = ['pageSize=300'];
    (mask || []).forEach(function (f) { q.push('mask.fieldPaths=' + f); });
    return fetch(G.BASE + col + '?' + q.join('&')).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) { return (j.documents || []).map(G.docOf); });
  }

  list('places', ['name', 'category', 'placeType', 'municipality', 'image', 'images', 'isMustVisit',
    'isFeatured', 'reviewStatus', 'is_active']).then(function (places) {
    var shown = places.filter(G.isPublic);
    var n = document.getElementById('hx-places');
    if (n && shown.length) n.textContent = shown.length + ' places';

    var must = G.filterPlaces(shown.filter(function (p) { return p.isMustVisit || p.isFeatured; }), {}).slice(0, 4);
    var box = document.getElementById('hx-must');
    if (!box || !must.length) return;
    var grid = el('div', 'g-grid');
    must.forEach(function (p) {
      var a = el('a', 'g-card');
      a.href = 'place.html?id=' + encodeURIComponent(p.id);
      var media = el('div', 'g-card-media');
      var ph = G.photos(p)[0];
      if (ph) {
        var i = el('img'); i.src = ph; i.alt = ''; i.loading = 'lazy'; i.decoding = 'async';
        i.onerror = function () { i.remove(); };
        media.appendChild(i);
      }
      media.appendChild(el('span', 'g-flag', p.isMustVisit ? 'Must visit' : 'Featured'));
      var body = el('div', 'g-card-body');
      body.appendChild(el('h3', 'g-card-title', p.name));
      body.appendChild(el('p', 'g-card-meta', [p.placeType || p.category, p.municipality].filter(Boolean).join(' · ')));
      a.appendChild(media); a.appendChild(body);
      grid.appendChild(a);
    });
    box.appendChild(grid);
    box.hidden = false;
  }).catch(function () { /* the tiles still work */ });

  list('island_hopping_tours').then(function (tours) {
    var n = document.getElementById('hx-tours');
    var count = G.toursShown(tours).length;
    if (n && count) n.textContent = count + (count === 1 ? ' tour' : ' tours');
  }).catch(function () { /* fine */ });

  list('terminals', ['ferries']).then(function (terminals) {
    var n = document.getElementById('hx-routes');
    var count = G.ferryRoutes(terminals.map(function (t) { return { ferries: t.ferries }; })).length;
    if (n && count) n.textContent = count + ' ferry routes';
  }).catch(function () { /* fine */ });
})();
