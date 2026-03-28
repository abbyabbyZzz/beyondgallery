/**
 * Single-scene Marzipano viewer for artwork-360 HD equirect (same drag logic as exhibition).
 * Depends: window.Marzipano, container element in DOM.
 */
(function (window) {
  'use strict';

  var viewer = null;

  function destroy() {
    if (viewer && typeof viewer.destroy === 'function') {
      try {
        viewer.destroy();
      } catch (e) {}
    }
    viewer = null;
    var el = document.getElementById('work-pano-viewer');
    if (el) {
      el.innerHTML = '';
    }
  }

  /**
   * @param {string} imageUrl
   * @param {{ yaw?: number, pitch?: number, fov?: number }} initialView - radians
   * @param {number} [eqWidth=8192]
   */
  function init(imageUrl, initialView, eqWidth) {
    destroy();
    var panoEl = document.getElementById('work-pano-viewer');
    var Marzipano = window.Marzipano;
    if (!panoEl || !Marzipano || !imageUrl) return;

    var w = typeof eqWidth === 'number' && eqWidth > 0 ? eqWidth : 8192;
    var iv = initialView || {};
    var yaw = typeof iv.yaw === 'number' ? iv.yaw : 0;
    var pitch = typeof iv.pitch === 'number' ? iv.pitch : 0;
    var fov = typeof iv.fov === 'number' ? iv.fov : 1.3705396696948544;

    var viewerOpts = {
      controls: {
        mouseViewMode: 'drag'
      }
    };
    viewer = new Marzipano.Viewer(panoEl, viewerOpts);

    var source = Marzipano.ImageUrlSource.fromString(imageUrl);
    var geometry = new Marzipano.EquirectGeometry([{ width: w }]);
    var limiter = Marzipano.RectilinearView.limit.traditional(
      w,
      (100 * Math.PI) / 180,
      (120 * Math.PI) / 180
    );
    var view = new Marzipano.RectilinearView({ yaw: yaw, pitch: pitch, fov: fov }, limiter);
    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: false
    });
    scene.switchTo();

    window.requestAnimationFrame(function () {
      if (viewer && typeof viewer.updateSize === 'function') {
        try {
          viewer.updateSize();
        } catch (e) {}
      }
    });
  }

  window.WorkPanoramaMarzipano = {
    init: init,
    destroy: destroy,
    updateSize: function () {
      if (viewer && typeof viewer.updateSize === 'function') {
        try {
          viewer.updateSize();
        } catch (e) {}
      }
    }
  };
})(window);
