/* =====================================================================
   ADVENTURE — shared site script (index.html + press.html)
   Every block checks that its elements exist, so pages can share it.
   ===================================================================== */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNarrow = () => matchMedia('(max-width: 760px)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const mapsUrl = name => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ', Romblon, Philippines')}`;

  /* ---------------------------------------------------------------
     Adventure cards
     --------------------------------------------------------------- */
  const ADVENTURES = [
    // each photo is used once on the page: Guiting has the Featured section and
    // Cresta de Gallo is on the Sibuyan destination card, so neither repeats here
    { name: 'Bon Bon Beach', type: 'Beach', loc: 'Romblon Island', img: 'images/web/bon.webp', w: 1000, h: 1251,
      alt: 'Aerial view of Bon Bon Beach’s sandbar stretching out to Bang-ug Island',
      text: 'Walk the sandbar to Bang-ug Island at low tide. Come at 6 AM and have the beach to yourself.' },
    { name: 'Turtle Cove', type: 'Cove', loc: 'Romblon', img: 'images/web/turtle-cove-swim.webp', w: 900, h: 1200,
      alt: 'Swimmers floating in clear turquoise water between dark rocks at Turtle Cove',
      text: 'Sheltered, glassy water — calm even when the open sea is rough. Criminally underrated snorkeling.' },
    { name: 'Bel-at Point', type: 'Point', loc: 'Romblon', img: 'images/web/bel-at.webp', w: 900, h: 1600,
      alt: 'Aerial view of Bel-at Point’s cove, pier and forested hills',
      text: 'Sunrise over open water and almost no one else around. Wear proper shoes for the rocky path.' },
    { name: 'Fuerza San Andres', type: 'Heritage', loc: 'Romblon Island', img: 'images/web/fuerza-san-andres.webp', w: 1000, h: 800,
      alt: 'Aerial view of the stone walls of Fuerza San Andres surrounded by palm trees',
      text: 'A Spanish-era stone fort on the hill above Romblon town, with views over the harbor.' },
    { name: 'Agabalit', type: 'River', loc: 'Romblon', img: 'images/web/agabalit.webp', w: 900, h: 1199,
      alt: 'A clear green river pool beneath tall forest trees, with a person standing on the rocks',
      text: 'Clear, cool river pools under old forest — a quiet swim away from the beaches.' },
  ];

  const pinIcon = '<span class="ms ms-fill" style="font-size:12px" aria-hidden="true">location_on</span>';
  const arrowIcon = '<span class="ms" style="font-size:18px" aria-hidden="true">arrow_forward</span>';

  const advGrid = $('#advGrid');
  if (advGrid) {
    advGrid.innerHTML = ADVENTURES.map((a, i) => `
      <article class="adv-card">
        <div class="adv-media">
          <span class="adv-type">${a.type}</span>
          <span class="adv-zoom"><img src="${a.img}" alt="${a.alt}" width="${a.w}" height="${a.h}" loading="lazy" decoding="async" data-parallax-inner="8"></span>
          <span class="adv-idx" aria-hidden="true">0${i + 1} / 0${ADVENTURES.length}</span>
        </div>
        <div class="adv-body">
          <span class="adv-loc">${pinIcon}${a.loc}</span>
          <h3>${a.name}</h3>
          <span class="adv-arrow" aria-hidden="true">${arrowIcon}</span>
          <p>${a.text}</p>
        </div>
        <a class="cover" href="${mapsUrl(a.name)}" target="_blank" rel="noopener noreferrer"
           aria-label="${a.name}, ${a.loc} — open in Google Maps (new tab)"></a>
      </article>`).join('') + `
      <article class="adv-card suggest">
        <div class="adv-media">
          <p class="big">Know a spot that isn’t on the <span class="accent">map?</span></p>
          <p class="small">Beaches, eateries, marble workshops, fiesta dates — if you know a place, we’d love to add it.</p>
        </div>
        <div class="adv-body">
          <span class="adv-loc">${pinIcon}Anywhere in Romblon</span>
          <h3>Suggest a spot</h3>
          <span class="adv-arrow" aria-hidden="true">${arrowIcon}</span>
        </div>
        <a class="cover" href="#contact" aria-label="Suggest a spot — go to contact"></a>
      </article>`;
  }

  /* ---------------------------------------------------------------
     Credits (press page)
     --------------------------------------------------------------- */
  const creditsGrid = $('#creditsGrid');
  if (creditsGrid) {
    const credits = [
      ['Tablas Island and Beyond', 'https://www.facebook.com/BeautifulTablasIsland'],
      ['Romblon Island Explorer', 'https://www.facebook.com/profile.php?id=100063880876770'],
      ['Just Lens', 'https://www.facebook.com/profile.php?id=100076982260081'],
      ['Rochtan in Romblon', 'https://www.facebook.com/profile.php?id=61576414104865'],
      ['BeyondLens', 'https://www.facebook.com/BeyondLensV'],
      ['PanawJuan', 'https://www.facebook.com/PanawJuanVlogs'],
      ['Binucot Pearl Boutique Resort', 'https://www.facebook.com/binucotpearlboutique.ph'],
      ['BLAC.', 'https://www.facebook.com/profile.php?id=61590603137753'],
      ['Pahuway Café - Romblon.', 'https://www.facebook.com/profile.php?id=61574339678458'],
      ['Romblon Provincial Tourism and Cultural Affairs Office', 'https://www.facebook.com/profile.php?id=61590316604668'],
      ['Star Palace Restaurant & Cafe in Odiongan, Tablas Island, Romblon', 'https://www.facebook.com/starpalacerestaurant'],
      ['Wander Twins', 'https://www.facebook.com/wandertwinsofficial'],
    ];
    const esc = s => s.replace(/&/g, '&amp;');
    creditsGrid.innerHTML = credits.map(([name, url]) => `
      <a class="credit" href="${url}" target="_blank" rel="noopener noreferrer">
        <span>${esc(name)}<span class="sr-only"> (opens Facebook in a new tab)</span></span>
        <span class="ms" style="font-size:14px" aria-hidden="true">north_east</span>
      </a>`).join('');
  }

  /* ---------------------------------------------------------------
     Navigation: solid state, mobile menu, scroll-spy
     --------------------------------------------------------------- */
  const nav = $('#nav');
  const burger = $('#burger');
  const menu = $('#mobileMenu');

  function setMenu(open) {
    if (!menu) return;
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.inert = !open;
    // keep keyboard focus inside the open menu: the page behind becomes non-interactive
    $$('body > header, body > main, body > footer').forEach(el => { el.inert = open; });
    if (open) setTimeout(() => menu.querySelector('a')?.focus({ preventScroll: true }), 350);
  }
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); burger.focus(); }
    });
    matchMedia('(min-width: 1081px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  // one rAF-throttled scroll handler for nav + progress bar
  const progress = $('.progress');
  const forceSolid = nav && nav.dataset.solid === 'always';
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    if (nav && !forceSolid) nav.classList.toggle('is-solid', y > 40);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    }
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  const spyLinks = $$('.nav-links a[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(spyLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        spyLinks.forEach(a => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        const link = byId.get(e.target.id);
        if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
    // clear when back at the hero
    const hero = $('.hero');
    if (hero) new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio > .5) spyLinks.forEach(a => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
    }, { threshold: [.5] }).observe(hero);
  }

  /* ---------------------------------------------------------------
     Hero background carousel
     - crossfades every DURATION ms; the dot for the current slide fills up
     - autoplays only when motion is allowed, pauses off-screen / hidden tab
     - pause button + clickable dots for manual control
     --------------------------------------------------------------- */
  function initHeroCarousel() {
    const slides = $$('.hero-slides .slide');
    const dotsWrap = $('#slideDots');
    if (slides.length < 2 || !dotsWrap) return;

    const DURATION = 6500;
    const ui = $('.hero-slider-ui');
    const toggle = $('#slideToggle');
    const numEl = $('#slideNum'), nameEl = $('#slideName'), locEl = $('#slideLoc');
    const pad = n => String(n).padStart(2, '0');
    let index = 0, timer = 0, userPaused = reduced, inView = true;

    // load the remaining photos once the page itself has finished loading
    const loadRest = () => $$('img[data-src]', $('.hero-slides')).forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
    if (document.readyState === 'complete') loadRest(); else window.addEventListener('load', loadRest, { once: true });

    const dots = slides.map((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slide-dot';
      b.setAttribute('aria-label', `Show photo ${i + 1}: ${s.dataset.name}`);
      b.innerHTML = '<i></i>';
      b.addEventListener('click', () => { go(i); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });
    ui.style.setProperty('--slide-dur', DURATION + 'ms');

    function go(i) {
      index = (i + slides.length) % slides.length;
      const img = $('img', slides[index]);
      if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
      slides.forEach((s, n) => s.classList.toggle('is-active', n === index));
      dots.forEach((d, n) => {
        d.classList.toggle('is-active', n === index);
        n === index ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current');
        const bar = d.firstChild; bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; // restart fill
      });
      numEl.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;
      nameEl.textContent = slides[index].dataset.name;
      locEl.textContent = slides[index].dataset.loc;
    }

    const playing = () => !userPaused && inView && !document.hidden;
    function restart() {
      clearInterval(timer);
      ui.classList.toggle('is-playing', !userPaused);
      ui.classList.toggle('is-paused', !playing());
      if (playing()) timer = setInterval(() => go(index + 1), DURATION);
    }

    toggle.addEventListener('click', () => {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.setAttribute('aria-label', userPaused ? 'Play background slideshow' : 'Pause background slideshow');
      if (!userPaused) go(index); // restart the current dot's fill
      restart();
    });
    if (userPaused) { toggle.setAttribute('aria-pressed', 'true'); toggle.setAttribute('aria-label', 'Play background slideshow'); }

    // when coming back into view / to the tab, restart the current slide's timer and fill together
    const resume = () => { if (playing()) go(index); restart(); };
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; resume(); }).observe($('.hero'));
    document.addEventListener('visibilitychange', resume);

    go(0);
    restart();
  }

  /* ---------------------------------------------------------------
     Intro statement: split into words for the scroll highlight
     --------------------------------------------------------------- */
  const statement = $('[data-words]');
  let words = [];
  if (statement) {
    const label = statement.textContent.replace(/\s+/g, ' ').trim();
    const frag = document.createDocumentFragment();
    statement.childNodes.forEach(node => {
      const isHl = node.nodeType === 1 && node.classList.contains('hl');
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'w' + (isHl ? ' hl' : '');
        s.textContent = part;
        s.setAttribute('aria-hidden', 'true');
        frag.appendChild(s);
      });
    });
    statement.textContent = '';
    statement.appendChild(frag);
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label;
    statement.appendChild(sr);
    words = $$('.w', statement);
  }

  /* ---------------------------------------------------------------
     Motion (GSAP + ScrollTrigger)
     --------------------------------------------------------------- */
  initHeroCarousel();

  function disableMotion() {
    root.classList.add('no-anim');
    words.forEach(w => w.classList.add('on'));
  }

  if (reduced) { disableMotion(); return; }
  if (!window.gsap || !window.ScrollTrigger) { disableMotion(); return; }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const ease = 'power3.out';
  const k = isNarrow() ? 0.45 : 1; // parallax intensity

  /* ---- Hero entrance: background → eyebrow → headline → copy → CTA → details ---- */
  const hero = $('.hero');
  if (hero) {
    const tl = gsap.timeline({ defaults: { ease, duration: 1 } });
    // add a step only if this page has that element (index and press share this)
    const step = (sel, from, to, at) => { if ($(sel, hero)) tl.fromTo($$(sel, hero), from, to, at); };
    if ($('.hero-topo', hero)) tl.from($$('.hero-topo', hero), { opacity: 0, duration: 1.4 }, 0); // back to its CSS opacity
    step('[data-hero="eyebrow"]', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8 }, .25);
    step('.ln > span', { yPercent: 105, y: 0 }, { yPercent: 0, y: 0, duration: 1.15, stagger: .12, ease: 'power4.out' }, .4);
    step('[data-hero="desc"]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .9 }, .85);
    step('[data-hero="cta"]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .9 }, 1.0);
    step('[data-hero="visual"]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1 }, 1.2);
    step('[data-hero="foot"]', { opacity: 0 }, { opacity: 1, duration: 1 }, 1.3);

    // background photos drift slower than the page (text stays fully opaque)
    const heroSlides = $('.hero-slides', hero);
    if (heroSlides) gsap.to(heroSlides, {
      yPercent: 8 * k, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  /* ---- Headline lines (outside hero) ---- */
  $$('h1, h2').filter(h => !h.closest('.hero') && h.querySelector('.ln')).forEach(h => {
    // y: 0 clears the CSS pre-hide offset, which GSAP would otherwise read back as pixels
    gsap.fromTo($$('.ln > span', h), { yPercent: 105, y: 0 }, {
      yPercent: 0, y: 0, duration: 1.1, stagger: .1, ease: 'power4.out',
      scrollTrigger: { trigger: h, start: 'top 88%', once: true },
    });
  });

  /* ---- Section rules ---- */
  $$('.sec-head .rule').forEach(r => {
    gsap.fromTo(r, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'power3.inOut', scrollTrigger: { trigger: r, start: 'top 90%', once: true } });
  });

  /* ---- Generic reveals ---- */
  $$('[data-reveal]').forEach(el => {
    const type = el.dataset.reveal;
    const st = { trigger: el, start: isNarrow() ? 'top 94%' : 'top 86%', once: true };
    if (type === 'clip') {
      gsap.fromTo(el, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'power4.inOut', scrollTrigger: st });
      const img = $('img', el);
      if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.6, ease: 'power3.out', scrollTrigger: st });
    } else if (type === 'fade') {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 1, ease, scrollTrigger: st });
    } else {
      gsap.fromTo(el, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: .95, ease, scrollTrigger: st, clearProps: 'transform' });
    }
  });

  $$('[data-stagger]').forEach(group => {
    gsap.fromTo([...group.children], { opacity: 0, y: 28 }, {
      opacity: 1, y: 0, duration: .85, ease, stagger: .09, clearProps: 'transform',
      scrollTrigger: { trigger: group, start: isNarrow() ? 'top 94%' : 'top 86%', once: true },
    });
  });

  /* ---- Adventure cards: staggered entrance ---- */
  if (advGrid) {
    const cols = () => (isNarrow() ? 1 : innerWidth <= 1000 ? 2 : 3);
    $$('.adv-card', advGrid).forEach((card, i) => {
      gsap.fromTo(card, { opacity: 0, y: 48 }, {
        opacity: 1, y: 0, duration: 1, ease, delay: (i % cols()) * .12, clearProps: 'transform',
        scrollTrigger: { trigger: card, start: 'top 92%', once: true },
      });
    });
  }

  /* ---- Intro statement: words light up as you read ---- */
  if (words.length) {
    ScrollTrigger.create({
      trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: self => {
        const n = Math.round(self.progress * words.length);
        words.forEach((w, i) => w.classList.toggle('on', i < n));
      },
    });
  }

  /* ---- Parallax ---- */
  // data-parallax="px": element moves across its scroll range (negative = moves up faster)
  $$('[data-parallax]').forEach(el => {
    const amt = parseFloat(el.dataset.parallax) * k;
    gsap.fromTo(el, { y: -amt / 2 }, {
      y: amt / 2, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  // data-parallax-inner="%": image drifts inside its overflow-hidden frame
  $$('[data-parallax-inner]').forEach(img => {
    const amt = parseFloat(img.dataset.parallaxInner) * k;
    const frame = img.parentElement;
    gsap.fromTo(img, { yPercent: -amt / 2 }, {
      yPercent: amt / 2, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  // data-drift="%": horizontal drift (giant type)
  $$('[data-drift]').forEach(el => {
    const amt = parseFloat(el.dataset.drift);
    gsap.fromTo(el, { xPercent: 0 }, {
      xPercent: amt, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  // island-name marquee moves with scroll, not on a timer
  $$('[data-marquee]').forEach(track => {
    gsap.fromTo(track, { xPercent: 0 }, {
      xPercent: -35, ease: 'none',
      scrollTrigger: { trigger: track, start: 'top bottom', end: 'bottom top', scrub: .6 },
    });
  });

  /* ---- App steps: spine draws as you scroll ---- */
  const spine = $('.steps .spine i');
  if (spine) {
    gsap.fromTo(spine, { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 55%', scrub: true },
    });
  }

  /* ---- Counters ---- */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const comma = el.dataset.format === 'comma';
    const fmt = v => {
      const s = v.toFixed(dec);
      return comma ? Number(s).toLocaleString('en-US') : s;
    };
    const obj = { v: 0 };
    el.textContent = fmt(0);
    gsap.to(obj, {
      v: end, duration: 2, ease: 'power2.out',
      onUpdate: () => { el.textContent = fmt(obj.v); },
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  /* ---- Keep trigger positions right after images/fonts settle ---- */
  let refreshT;
  const refresh = () => { clearTimeout(refreshT); refreshT = setTimeout(() => ScrollTrigger.refresh(), 200); };
  window.addEventListener('load', refresh);
  if (document.fonts?.ready) document.fonts.ready.then(refresh);
})();
