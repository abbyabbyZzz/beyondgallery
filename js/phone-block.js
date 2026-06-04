/**
 * Blocks portrait orientation on phones/tablets with small viewports.
 * Shows rotate-overlay when the device is in portrait (height > width)
 * and the shorter edge is smaller than a typical tablet (768px).
 */
;(function () {
  'use strict';

  function shouldBlockPortrait() {
    var w = window.innerWidth || 0;
    var h = window.innerHeight || 0;
    var min = Math.min(w, h);

    // Allow tablets and large screens in any orientation
    if (min >= 768) return false;

    // Allow desktop browsers even if window is narrow
    try {
      if (window.matchMedia('(pointer: fine)').matches && window.matchMedia('(hover: hover)').matches) {
        return false;
      }
    } catch (e) {}

    // Block only when in portrait (taller than wide)
    return h > w;
  }

  function updateRotateOverlay() {
    var el = document.getElementById('rotate-overlay');
    if (!el) return;
    var show = shouldBlockPortrait();
    el.classList.toggle('is-visible', show);
    el.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  window.addEventListener('resize', updateRotateOverlay);
  window.addEventListener('orientationchange', function () {
    // Delay to let the browser settle into the new orientation
    setTimeout(updateRotateOverlay, 50);
    setTimeout(updateRotateOverlay, 200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateRotateOverlay);
  } else {
    updateRotateOverlay();
  }
})();
