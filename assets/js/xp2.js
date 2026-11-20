/* xp2 — behaviour for the "Signature" policy-experience tier (.sx pages).
   Progressive everywhere: with JS off the page is a beautifully styled,
   fully readable document. Reveal + count-up come from site-astro.js. */
(function () {
  'use strict';

  /* ---- reading progress bar ------------------------------------------------ */
  var bar = document.getElementById('sxProgress');
  if (bar) {
    var onScroll = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- section rail scroll-spy ---------------------------------------------- */
  var rail = document.getElementById('sxRail');
  if (rail && 'IntersectionObserver' in window) {
    var links = Array.prototype.slice.call(rail.querySelectorAll('[data-spy]'));
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('data-spy')] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('on'); });
        var a = byId[en.target.id];
        if (a) {
          a.classList.add('on');
          // keep the active chip in view on the horizontal rail
          if (a.scrollIntoView && rail.scrollWidth > rail.clientWidth) {
            try { a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); } catch (e) { /* older UA */ }
          }
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    links.forEach(function (a) {
      var t = document.getElementById(a.getAttribute('data-spy'));
      if (t) io.observe(t);
    });
  }

  /* ---- keep the rail parked directly UNDER the sticky site header ----------
     The header is sticky at top:0 with a higher z-index, so a rail stuck at
     top:0 disappears behind it. Publish the header's real height as --sx-hdr
     (CSS carries a static fallback for the no-JS case) and the rail — plus the
     scroll-margin on every anchor target — follows it at any breakpoint. */
  var hdr = document.getElementById('site-header') || document.querySelector('.adw-header');
  if (hdr) {
    var syncHdr = function () {
      var h = Math.round(hdr.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty('--sx-hdr', h + 'px');
    };
    syncHdr();
    window.addEventListener('resize', syncHdr, { passive: true });
    window.addEventListener('orientationchange', syncHdr);
    if ('ResizeObserver' in window) { try { new ResizeObserver(syncHdr).observe(hdr); } catch (e) { /* older UA */ } }
  }

  /* ---- casino hero: the live loss ticker ($25bn/yr ≈ $792/sec) -------------- */
  var tick = document.getElementById('sxTick');
  if (tick) {
    var t0 = Date.now();
    setInterval(function () {
      var d = Math.floor(((Date.now() - t0) / 1000) * 792);
      tick.textContent = '$' + d.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }, 250);
  }
})();
