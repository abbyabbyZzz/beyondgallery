/**
 * Shows #rotate-overlay on phone-sized viewports so the site is used on tablet/desktop only.
 * Threshold: shorter viewport edge &lt; 768px (typical phone); iPad short edge is ≥768px.
 * Narrow desktop windows with mouse + hover are still allowed.
 */
;(function () {
  'use strict';

  function isPhoneViewport() {
    var w = window.innerWidth || 0;
    var h = window.innerHeight || 0;
    var min = Math.min(w, h);
    if (min >= 768) return false;
    try {
      if (window.matchMedia('(pointer: fine)').matches && window.matchMedia('(hover: hover)').matches) {
        return false;
      }
    } catch (e) {}
    return true;
  }

  function updateRotateOverlay() {
    var el = document.getElementById('rotate-overlay');
    if (!el) return;
    var show = isPhoneViewport();
    el.classList.toggle('is-visible', show);
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  window.addEventListener('resize', updateRotateOverlay);
  window.addEventListener('orientationchange', updateRotateOverlay);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateRotateOverlay);
  } else {
    updateRotateOverlay();
  }
})();
