/* Member spotlight — the rotating row of photo cards on the homepage.
   Settings: /keystatic → Homepage → Member spotlight → Rotate / Rotation
   direction / Seconds per step (src/pages/index.astro renders the markup and
   only loads this file when the row should rotate).

   Progressive: without JS the cards are a still grid. With JS the row loops
   without end, one card per step:
     data-dir="ltr"  the cards travel left → right; the right-hand card wraps
                     round and comes back in at the left
     data-dir="rtl"  the cards travel right → left; the left-hand card wraps
                     round and comes back in at the right
   It is seamless because whole copies of the row sit either side of the real
   one and the strip jumps (invisibly) back into the middle after each step.
   Exactly ONE card per person is exposed to assistive tech at any time — the
   one on screen when that person is showing — and every other copy is
   aria-hidden + inert; so a screen reader meets each person once, and touch
   exploration finds the card under the finger.

   It waits while the mouse is over it, while the tab is hidden or the band is
   off screen. It stops for good (until Play) on Pause, when keyboard focus
   enters it (WAI-ARIA carousel pattern), or when assistive tech scrolls a card
   into view; and it never moves by itself when the device asks for reduced
   motion (WCAG 2.2.2) — there Play is an explicit opt-in, and steps jump, not
   slide. Touch: swipe left/right. Manual moves are announced politely;
   automatic ones never are (they clear the announcement silently).

   When everyone fits on screen at once (e.g. three people, three cards across
   on a computer) there is nothing to rotate: the row holds still with no
   buttons or timer, and reads as a plain group. Re-decided on every resize. */
(function () {
  'use strict';
  var root = document.querySelector('[data-spotcar]');
  if (!root) return;
  var vp = root.querySelector('.adw-spotcar-vp');
  var track = root.querySelector('.adw-spotcards');
  var ctl = root.querySelector('.adw-spotcar-ctl');
  var btnToggle = root.querySelector('[data-spotcar-toggle]');
  var btnPrev = root.querySelector('[data-spotcar-prev]');
  var btnNext = root.querySelector('[data-spotcar-next]');
  var status = root.querySelector('[data-spotcar-status]');
  var bar = root.querySelector('.adw-spotcar-timer i');
  if (!vp || !track || !ctl || !btnToggle || !btnPrev || !btnNext) return;
  var originals = Array.prototype.slice.call(track.children);
  var N = originals.length;
  if (N < 2) return;

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var AUTO = root.getAttribute('data-dir') === 'rtl' ? 1 : -1; // strip index change per automatic step
  var MS = 1000 * Math.min(30, Math.max(3, parseFloat(root.getAttribute('data-seconds')) || 8));

  // ---- the strip: K whole copies of the row on each side of the real one ----
  // (enough for the widest layout, three cards across, even with two people)
  var K = Math.ceil(3 / N);
  function copyOf(el) {
    var c = el.cloneNode(true);
    c.setAttribute('data-clone', '');
    return c;
  }
  var labels = originals.map(function (o) { return o.getAttribute('aria-label'); });
  var before = document.createDocumentFragment();
  var after = document.createDocumentFragment();
  for (var k = 0; k < K; k++) {
    for (var j = 0; j < N; j++) {
      before.appendChild(copyOf(originals[j]));
      after.appendChild(copyOf(originals[j]));
    }
  }
  track.insertBefore(before, track.firstChild);
  track.appendChild(after);
  var items = track.children;
  var BASE = K * N; // index of the first real card
  var pos = BASE;   // index of the card at the left edge

  root.classList.add('is-car');
  ctl.hidden = false;

  // which copy of each person assistive tech sees: the one in the window if
  // that person is on screen, otherwise the real one
  function perView() {
    var v = parseInt(getComputedStyle(root).getPropertyValue('--per'), 10);
    return v > 0 ? Math.min(v, N) : 1;
  }
  var still = null; // everyone fits: no movement, no controls
  var roleDesc = root.getAttribute('aria-roledescription');
  function expose() {
    var per = perView(), pick = [];
    for (var j = 0; j < N; j++) pick[j] = items[BASE + j];
    for (var w = pos; w < pos + per; w++) pick[((w - BASE) % N + N) % N] = items[w];
    for (var x = 0; x < items.length; x++) {
      var el = items[x], who = ((x - BASE) % N + N) % N, on = pick[who] === el;
      if (on && still) { // a plain card in a plain row
        el.removeAttribute('role');
        el.removeAttribute('aria-roledescription');
        el.removeAttribute('aria-label');
        el.removeAttribute('aria-hidden');
        el.removeAttribute('inert');
      } else if (on) {
        el.setAttribute('role', 'group');
        el.setAttribute('aria-roledescription', 'slide');
        if (labels[who]) el.setAttribute('aria-label', labels[who]);
        el.removeAttribute('aria-hidden');
        el.removeAttribute('inert');
      } else {
        el.removeAttribute('role');
        el.removeAttribute('aria-roledescription');
        el.removeAttribute('aria-label');
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('inert', '');
      }
    }
  }

  // the step is left to CSS — (track width + gap) / cards across — so it is
  // exact at every width and never accumulates rounding as the row loops;
  // slot (fractional, layout units) only converts a viewport scroll to cards
  var slot = 0;
  function measure() {
    slot = (parseFloat(getComputedStyle(items[0]).width) || 0) + (parseFloat(getComputedStyle(track).columnGap) || 0);
  }
  function paint(animate) {
    track.style.transition = animate ? '' : 'none';
    track.style.transform = 'translate3d(calc(' + (-pos) + ' * (100% + var(--gap)) / var(--per)),0,0)';
    if (!animate) void track.offsetWidth; // commit before transitions come back
  }
  function normalise() { // back into the real row: same picture, different copy
    if (pos < BASE) { pos += N; paint(false); }
    else if (pos >= BASE + N) { pos -= N; paint(false); }
    expose();
  }

  var moving = false, guard = null;
  function settle() {
    if (!moving) return;
    moving = false;
    clearTimeout(guard);
    paint(false); // lands exactly, even if a new move cut the slide short
    normalise();
  }
  track.addEventListener('transitionend', function (e) {
    if (e.target === track && e.propertyName === 'transform') settle();
  });
  function step(delta) {
    settle();
    pos += delta;
    if (reduce.matches) { paint(false); normalise(); return; }
    moving = true;
    paint(true);
    guard = setTimeout(settle, 1500); // transitionend can be skipped (hidden tab, interrupted)
  }

  // ---- what is on screen (for the polite announcement) ----
  function nameAt(idx) {
    var o = originals[((idx - BASE) % N + N) % N];
    var t = o.querySelector('.tag');
    return t ? t.textContent.trim() : '';
  }
  function announce() {
    if (!status) return;
    var names = [];
    for (var v = 0, per = perView(); v < per; v++) names.push(nameAt(pos + v));
    var list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
    status.textContent = 'Showing ' + list;
  }

  // ---- the clock ----
  var playing = !reduce.matches;
  var holds = { hover: false, hidden: !!document.hidden, off: true };
  var timer = null, left = MS, started = 0;
  function active() { return playing && !still && !holds.hover && !holds.hidden && !holds.off; }
  function applyFit() {
    var f = N <= perView();
    if (f === still) return;
    still = f;
    root.classList.toggle('is-still', f);
    ctl.hidden = f;
    if (f) {
      settle();
      pos = BASE; // the real row, in order
      paint(false);
      left = MS;
      if (status) status.textContent = '';
      root.removeAttribute('aria-roledescription');
    } else {
      if (roleDesc) root.setAttribute('aria-roledescription', roleDesc);
      left = MS;
      restartBar();
    }
  }
  function stop() { if (playing) { playing = false; sync(); } }
  function restartBar() {
    if (!bar) return;
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.animation = '';
  }
  function sync() {
    var on = active();
    if (on && !timer) { started = Date.now(); timer = setTimeout(tick, left); }
    else if (!on && timer) { clearTimeout(timer); timer = null; left = Math.max(0, left - (Date.now() - started)); }
    root.classList.toggle('is-paused', !on);
    root.classList.toggle('is-stopped', !playing);
    btnToggle.setAttribute('aria-label', playing ? 'Pause the rotation' : 'Play the rotation');
  }
  function tick() {
    timer = null;
    left = MS;
    restartBar();
    if (status) status.textContent = ''; // silent: clearing is not announced
    step(AUTO);
    sync();
  }
  function manual(delta) {
    if (still) return;
    if (timer) { clearTimeout(timer); timer = null; }
    left = MS;
    restartBar();
    step(delta);
    announce();
    sync();
  }

  btnToggle.addEventListener('click', function () {
    playing = !playing;
    if (playing) { holds.hover = false; left = MS; restartBar(); if (status) status.textContent = ''; }
    sync();
  });
  btnPrev.addEventListener('click', function () { manual(-1); });
  btnNext.addEventListener('click', function () { manual(1); });

  // hover (mouse only — a tap must not leave a sticky hover pause behind)
  root.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { holds.hover = true; sync(); } });
  root.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { holds.hover = false; sync(); } });
  // keyboard focus entering stops it until Play (a mouse click on a button is
  // not a reason to stop: that is not :focus-visible)
  root.addEventListener('focusin', function (e) {
    var kb = true;
    try { kb = e.target.matches(':focus-visible'); } catch (err) {}
    if (kb) stop();
  });
  // assistive tech bringing an off-screen card into view scrolls the clipped
  // viewport; fold that into the strip (so the card stays in view and the
  // announcements stay true) and stop — the visitor is reading
  vp.addEventListener('scroll', function () {
    var sl = vp.scrollLeft;
    if (!sl) return;
    vp.scrollLeft = 0;
    settle();
    if (slot) { pos += Math.round(sl / slot); paint(false); normalise(); }
    stop();
  });
  document.addEventListener('visibilitychange', function () { holds.hidden = !!document.hidden; sync(); });

  // swipe (touch and pen; the page still scrolls vertically: touch-action pan-y)
  var sx = null, sy = 0;
  vp.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    sx = e.clientX; sy = e.clientY;
  });
  vp.addEventListener('pointerup', function (e) {
    if (sx === null) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) manual(dx > 0 ? -1 : 1);
  });
  vp.addEventListener('pointercancel', function () { sx = null; });

  // photos in slides clipped by the viewport never count as "near the screen",
  // so lazy loading would leave them blank until they slid in: load them all
  // once the band is close
  function loadAll() {
    Array.prototype.forEach.call(track.querySelectorAll('img[loading="lazy"]'), function (im) { im.loading = 'eager'; });
  }
  if ('IntersectionObserver' in window) {
    var near = new IntersectionObserver(function (es) {
      if (es.some(function (en) { return en.isIntersecting; })) { loadAll(); near.disconnect(); }
    }, { rootMargin: '800px 0px' });
    near.observe(root);
    new IntersectionObserver(function (es) {
      holds.off = !es[es.length - 1].isIntersecting;
      sync();
    }, { threshold: 0.25 }).observe(vp);
  } else {
    loadAll();
    holds.off = false;
  }

  function relayout() { settle(); measure(); applyFit(); paint(false); expose(); sync(); }
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(vp);
  else window.addEventListener('resize', relayout);
  if (reduce.addEventListener) reduce.addEventListener('change', function () { if (reduce.matches) { playing = false; sync(); } });

  measure();
  applyFit();
  paint(false);
  expose();
  sync();
})();
