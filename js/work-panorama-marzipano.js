/**
 * Single-scene Marzipano viewer for artwork-360 HD equirect (drag + pinch zoom on mobile).
 * Depends: window.Marzipano, container element in DOM.
 */
(function (window) {
  'use strict';

  var viewer = null;
  var documentDragFixTeardown = null;

  function destroy() {
    if (typeof documentDragFixTeardown === 'function') {
      try {
        documentDragFixTeardown();
      } catch (e) {}
      documentDragFixTeardown = null;
    }
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
   * Enable pinch-to-zoom by tracking two-finger distance and adjusting FOV.
   * This does not interfere with Marzipano single-finger drag.
   */
  function enablePinchZoom(view, container) {
    if (!container || !view) return;
    var startDist = 0;
    var startFov = 0;
    var pinching = false;

    function getDist(touches) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    container.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinching = true;
        startDist = getDist(e.touches);
        try {
          startFov = view.fov();
        } catch (err) {
          startFov = 1.3705396696948544;
        }
      }
    }, { passive: true });

    container.addEventListener('touchmove', function (e) {
      if (pinching && e.touches.length === 2) {
        var dist = getDist(e.touches);
        if (startDist > 0) {
          var scale = dist / startDist;
          try {
            var newFov = startFov / scale;
            // Clamp to a reasonable range within Marzipano limiter bounds
            if (newFov < 0.5) newFov = 0.5;
            if (newFov > 2.5) newFov = 2.5;
            view.setFov(newFov);
          } catch (err) {}
        }
      }
    }, { passive: true });

    container.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) {
        pinching = false;
      }
    }, { passive: true });
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
    if (typeof window.installMarzipanoDocumentMouseDrag === 'function') {
      try {
        documentDragFixTeardown = window.installMarzipanoDocumentMouseDrag(viewer);
      } catch (e) {
        documentDragFixTeardown = null;
      }
    }

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

    // Enable pinch-to-zoom on touch devices (drag is handled by Marzipano touchView)
    var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
      enablePinchZoom(view, panoEl);
    }

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
