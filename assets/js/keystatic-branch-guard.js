// Branch guard for prefixed Keystatic admins (the sandbox + sandbox-<greek> Workers).
//
// Keystatic's branchPrefix filters the branch picker and prefixes new branches, but
// it ALWAYS includes the repo's default branch in the picker (verified against the
// @keystatic/core source, 2026-08-15) — so on the sandbox admin `main` stays
// selectable, and one misclick would commit to production content and fire a gate
// deploy. There is no server-side fix: Keystatic commits from the browser as the
// signed-in user, so GitHub cannot tell which admin made the call.
//
// This script is therefore UX-ONLY accident prevention, same doctrine as
// keystatic-image-guard.js (client-side checks are UX; the real bound is that every
// editor who can sign in here already holds repo write and could edit main via the
// production admin as themselves). Two nets:
//   1. URL watchdog — any navigation to /keystatic/branch/<non-prefixed> is bounced
//      straight back to the prefix branch, so even a successful "switch to main"
//      lands the editor back on the sandbox branch before they can save anything.
//   2. Picker sweep — the always-shown default-branch row (identified by Keystatic's
//      own "Default branch" description) is hidden from branch listboxes.
//
// Injected by src/middleware.ts ONLY when the Worker's runtime env carries
// PUBLIC_KEYSTATIC_BRANCH_PREFIX (the prefix arrives via data-prefix on the script
// tag). Production and preview never set it, so this spreads to nothing there.
// Silent by design: if it breaks, Keystatic still works — just without the net.
(function () {
  var el = document.currentScript;
  var prefix = el && el.dataset ? el.dataset.prefix || '' : '';
  if (!prefix) return;

  function branchFromPath() {
    var m = location.pathname.match(/^\/keystatic\/branch\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function enforceUrl() {
    var b = branchFromPath();
    if (b && b.indexOf(prefix) !== 0) {
      location.replace('/keystatic/branch/' + encodeURIComponent(prefix));
    }
  }
  enforceUrl();
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    history[k] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(enforceUrl, 0);
      return r;
    };
  });
  window.addEventListener('popstate', enforceUrl);

  // Hide the default-branch row. Scoped tightly: only options carrying Keystatic's
  // "Default branch" description are touched, so every other combobox in the admin
  // (editor fields etc.) is left alone.
  function sweep() {
    var opts = document.querySelectorAll('[role="option"]');
    for (var i = 0; i < opts.length; i++) {
      var text = (opts[i].textContent || '').trim();
      if (text.indexOf('Default branch') !== -1 && text.indexOf(prefix) !== 0) {
        opts[i].style.display = 'none';
        opts[i].setAttribute('aria-hidden', 'true');
      }
    }
  }
  var mo = new MutationObserver(sweep);
  mo.observe(document.documentElement, { childList: true, subtree: true });
  sweep();
})();
