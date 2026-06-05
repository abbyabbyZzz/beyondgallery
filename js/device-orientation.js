/**
 * Device orientation (gyroscope) controls for Marzipano.
 * Replaces drag with phone tilt on mobile landscape.
 */
;(function (window) {
  'use strict';

  var isActive = false;
  var currentView = null;
  var initialPitch = 0;
  var initialYaw = 0;
  var baseBeta = null;
  var baseGamma = null;
  var hintEl = null;
  var YAW_SENSITIVITY = 6.5;
  var PITCH_SENSITIVITY = 1.8;

  // Exponential smoothing to filter hand tremor while keeping high sensitivity
  var smoothYaw = 0;
  var smoothPitch = 0;
  var SMOOTHING = 0.15;

  // Smooth calibration: average the first N samples so the view
  // stays at the scene's initial angle briefly regardless of phone angle
  var CALIBRATION_SAMPLES = 12;
  var calibrationBuffer = [];
  var isCalibrated = false;

  // Dead zone: after calibration, keep the view locked at the initial angle
  // until the user actively rotates the phone by more than this threshold.
  // This guarantees the painting is visible first, then motion kicks in.
  var MOTION_DEADZONE_DEG = 3;
  var hasLeftDeadZone = false;

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

    // Smooth calibration: collect first N samples before applying motion
    if (!isCalibrated) {
      calibrationBuffer.push({ beta: e.beta, gamma: e.gamma });
      if (calibrationBuffer.length < CALIBRATION_SAMPLES) {
        // During calibration the view stays locked to the scene's initial angle,
        // so the screen always faces the painting regardless of phone angle
        return;
      }
      var avgBeta = 0;
      var avgGamma = 0;
      for (var i = 0; i < calibrationBuffer.length; i++) {
        avgBeta += calibrationBuffer[i].beta;
        avgGamma += calibrationBuffer[i].gamma;
      }
      baseBeta = avgBeta / calibrationBuffer.length;
      baseGamma = avgGamma / calibrationBuffer.length;
      isCalibrated = true;
      return;
    }

    var dBeta = e.beta - baseBeta;
    var dGamma = e.gamma - baseGamma;

    // Dead zone: keep showing the painting until the user actively rotates the phone
    if (!hasLeftDeadZone) {
      if (Math.abs(dBeta) > MOTION_DEADZONE_DEG || Math.abs(dGamma) > MOTION_DEADZONE_DEG) {
        hasLeftDeadZone = true;
      } else {
        return;
      }
    }

    var orientation = getScreenOrientation();
    var rawYaw, rawPitch;

    // Device coordinates are device-frame relative.
    // In landscape the device-frame axes are rotated relative to the screen,
    // so beta/gamma swap roles compared to portrait.
    if (orientation === 90) {
      // Landscape: home button on the left (device rotated 90° CW)
      rawYaw = -toRad(dBeta) * YAW_SENSITIVITY;
      rawPitch = toRad(dGamma) * PITCH_SENSITIVITY;
    } else if (orientation === -90 || orientation === 270) {
      // Landscape: home button on the right (device rotated 90° CCW)
      rawYaw = toRad(dBeta) * YAW_SENSITIVITY;
      rawPitch = -toRad(dGamma) * PITCH_SENSITIVITY;
    } else {
      // Portrait: beta = pitch, gamma = yaw
      rawYaw = -toRad(dGamma) * YAW_SENSITIVITY;
      rawPitch = -toRad(dBeta) * PITCH_SENSITIVITY;
    }

    // Clamp relative pitch offset (not absolute pitch)
    rawPitch = clamp(rawPitch, -Math.PI / 2.5, Math.PI / 2.5);

    // Target = initial scene angle + gyroscope offset
    var targetYaw = initialYaw + rawYaw;
    var targetPitch = initialPitch + rawPitch;

    // Exponential smoothing to kill hand tremor while preserving large intentional motion
    smoothYaw += (targetYaw - smoothYaw) * SMOOTHING;
    smoothPitch += (targetPitch - smoothPitch) * SMOOTHING;

    try {
      currentView.setYaw(smoothYaw);
      currentView.setPitch(smoothPitch);
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

    // Preserve the scene's initial angles so gyroscope motion is relative to the opening view
    try {
      initialPitch = typeof view.pitch === 'function' ? view.pitch() : 0;
      initialYaw = typeof view.yaw === 'function' ? view.yaw() : 0;
    } catch (e) {
      initialPitch = 0;
      initialYaw = 0;
    }

    // Reset smoothing and calibration state on every attach (scene switch)
    smoothYaw = initialYaw;
    smoothPitch = initialPitch;
    calibrationBuffer = [];
    isCalibrated = false;
    hasLeftDeadZone = false;
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
    initialYaw = 0;
    smoothYaw = 0;
    smoothPitch = 0;
    calibrationBuffer = [];
    isCalibrated = false;
    hasLeftDeadZone = false;
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
