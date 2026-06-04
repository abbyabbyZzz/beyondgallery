/**
 * Device orientation (gyroscope) controls for Marzipano.
 * Replaces drag with phone tilt on mobile landscape.
 */
;(function (window) {
  'use strict';

  var isActive = false;
  var currentView = null;
  var initialPitch = 0;
  var baseBeta = null;
  var baseGamma = null;
  var hintEl = null;
  var SENSITIVITY = 2.2;

  function toRad(deg) {
    return deg * Math.PI / 180;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function getScreenOrientation() {
    try {
      return window.orientation || (screen.orientation && screen.orientation.angle) || 0;
    } catch (e) {
      return 0;
    }
  }

  function showTapHint() {
    if (hintEl) return;
    var viewerEl = document.getElementById('marzipano-viewer') || document.getElementById('work-pano-viewer');
    if (!viewerEl) return;
    hintEl = document.createElement('div');
    hintEl.id = 'mz-orientation-hint';
    hintEl.textContent = 'Tap to enable motion controls';
    hintEl.style.cssText =
      'position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;' +
      'font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.7);' +
      'background:rgba(0,0,0,0.35);pointer-events:auto;cursor:pointer;';
    hintEl.addEventListener('click', function onTap() {
      hintEl.removeEventListener('click', onTap);
      enableMotion();
    });
    viewerEl.appendChild(hintEl);
  }

  function hideTapHint() {
    if (hintEl) {
      hintEl.remove();
      hintEl = null;
    }
  }

  function onDeviceOrientation(e) {
    if (!isActive || !currentView) return;
    if (e.beta === null || e.gamma === null) return;

    if (baseBeta === null) {
      baseBeta = e.beta;
      baseGamma = e.gamma;
      return;
    }

    var dBeta = e.beta - baseBeta;
    var dGamma = e.gamma - baseGamma;

    var orientation = getScreenOrientation();
    var yaw, pitch;

    if (orientation === 90) {
      // Landscape: home button on the right
      yaw = -toRad(dBeta) * SENSITIVITY;
      pitch = -toRad(dGamma) * SENSITIVITY + initialPitch;
    } else if (orientation === -90 || orientation === 270) {
      // Landscape: home button on the left
      yaw = toRad(dBeta) * SENSITIVITY;
      pitch = toRad(dGamma) * SENSITIVITY + initialPitch;
    } else {
      // Portrait (fallback)
      yaw = -toRad(dGamma) * SENSITIVITY;
      pitch = -toRad(dBeta) * SENSITIVITY + initialPitch;
    }

    pitch = clamp(pitch, -Math.PI / 2.5, Math.PI / 2.5);

    try {
      currentView.setYaw(yaw);
      currentView.setPitch(pitch);
    } catch (err) {}
  }

  function requestPermission() {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      return DeviceOrientationEvent.requestPermission()
        .then(function (res) {
          return res === 'granted';
        })
        .catch(function () {
          return false;
        });
    }
    return Promise.resolve(true);
  }

  function enableMotion() {
    if (isActive) return Promise.resolve(true);
    return requestPermission().then(function (granted) {
      if (granted) {
        window.addEventListener('deviceorientation', onDeviceOrientation);
        isActive = true;
        hideTapHint();
      }
      return granted;
    });
  }

  function attach(view) {
    if (!view) return;
    currentView = view;

    // Preserve the scene's initial pitch so neutral hold matches the intended view
    try {
      initialPitch = typeof view.pitch === 'function' ? view.pitch() : 0;
    } catch (e) {
      initialPitch = 0;
    }

    // Reset calibration on every attach (scene switch)
    baseBeta = null;
    baseGamma = null;

    var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    enableMotion().then(function (granted) {
      if (!granted) {
        showTapHint();
      }
    });
  }

  function detach() {
    window.removeEventListener('deviceorientation', onDeviceOrientation);
    isActive = false;
    currentView = null;
    initialPitch = 0;
    baseBeta = null;
    baseGamma = null;
    hideTapHint();
  }

  window.DeviceOrientationControl = {
    attach: attach,
    detach: detach,
    isSupported: function () {
      return 'DeviceOrientationEvent' in window;
    },
    isActive: function () {
      return isActive;
    }
  };
})(window);
