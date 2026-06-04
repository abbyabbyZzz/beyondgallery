/**
 * Phone block is disabled — the site is now fully responsive on mobile.
 * This file is kept for compatibility but no longer blocks any viewport.
 */
;(function () {
  'use strict';

  function hideRotateOverlay() {
    var el = document.getElementById('rotate-overlay');
    if (!el) return;
    el.classList.remove('is-visible');
    el.setAttribute('aria-hidden', 'true');
    el.style.display = 'none';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideRotateOverlay);
  } else {
    hideRotateOverlay();
  }
})();
