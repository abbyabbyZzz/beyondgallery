/**
 * Marzipano viewer for exhibition page.
 * Expects: #marzipano-viewer, window.APP_DATA (from marzipano/data.js), window.Marzipano.
 */
(function (window) {
  'use strict';

  var viewer = null;
  var scenesByPoint = {};
  var sceneWrappers = [];
  var options = {};

  function stopTouchAndScrollEventPropagation(element) {
    var eventList = [
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel',
      'wheel',
      'mousewheel'
    ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function (event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneDataById(id) {
    var data = window.APP_DATA;
    if (!data || !data.scenes) return null;
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) return data.scenes[i];
    }
    return null;
  }

  function createNavHotspotElement(hotspot) {
    var wrap = document.createElement('div');
    wrap.className = 'exhibition-mz-hotspot exhibition-mz-hotspot--nav';
    var anchor = document.createElement('div');
    anchor.className = 'exhibition-mz-hotspot__anchor';

    var targetData = findSceneDataById(hotspot.target);
    var label = 'Go ' + (targetData && targetData.name ? String(targetData.name).toUpperCase() : '');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'exhibition-mz-hotspot__btn exhibition-mz-hotspot__btn--nav-floor';
    btn.setAttribute('aria-label', label);
    var span = document.createElement('span');
    span.className = 'exhibition-mz-hotspot__label';
    span.textContent = label;
    var ringWrap = document.createElement('span');
    ringWrap.className = 'exhibition-mz-hotspot__floor-ring-wrap';
    ringWrap.setAttribute('aria-hidden', 'true');
    var ring = document.createElement('span');
    ring.className = 'exhibition-mz-hotspot__floor-ring';
    ringWrap.appendChild(ring);
    btn.appendChild(span);
    btn.appendChild(ringWrap);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!targetData || !targetData.name) return;
      var name = String(targetData.name);
      if (/^p[1-8]$/.test(name) && typeof options.onNavigateToPanorama === 'function') {
        options.onNavigateToPanorama(name);
      }
    });

    stopTouchAndScrollEventPropagation(wrap);
    anchor.appendChild(btn);
    wrap.appendChild(anchor);
    return wrap;
  }

  function createArtworkHotspotElement(labelText, href) {
    var wrap = document.createElement('div');
    wrap.className = 'exhibition-mz-hotspot';
    var anchor = document.createElement('div');
    anchor.className = 'exhibition-mz-hotspot__anchor';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'exhibition-mz-hotspot__btn';
    btn.setAttribute('aria-label', labelText);

    var plus = document.createElement('span');
    plus.className = 'exhibition-mz-hotspot__plus';
    plus.textContent = '+';

    var lab = document.createElement('span');
    lab.className = 'exhibition-mz-hotspot__label';
    lab.textContent = labelText;

    btn.appendChild(plus);
    btn.appendChild(lab);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = href;
    });

    stopTouchAndScrollEventPropagation(wrap);
    anchor.appendChild(btn);
    wrap.appendChild(anchor);
    return wrap;
  }

  function equirectUrlForScene(sceneData) {
    var base = window.EXHIBITION_EQUIRECT_DIR || '../360/location/';
    var name = sceneData.name;
    if (!name || !/^p[1-8]$/.test(String(name))) {
      name = 'p1';
    }
    return base + name + '.JPG';
  }

  function createSceneForData(Marzipano, viewer, sceneData, useCubeTiles) {
    var limiter;
    var view;
    var scene;
    var geometry;
    var source;

    if (useCubeTiles) {
      var urlPrefix = 'marzipano/tiles';
      source = Marzipano.ImageUrlSource.fromString(
        urlPrefix + '/' + sceneData.id + '/{z}/{f}/{y}/{x}.jpg',
        { cubeMapPreviewUrl: urlPrefix + '/' + sceneData.id + '/preview.jpg' }
      );
      geometry = new Marzipano.CubeGeometry(sceneData.levels);
      limiter = Marzipano.RectilinearView.limit.traditional(
        sceneData.faceSize,
        (100 * Math.PI) / 180,
        (120 * Math.PI) / 180
      );
      view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);
      scene = viewer.createScene({
        source: source,
        geometry: geometry,
        view: view,
        pinFirstLevel: true
      });
    } else {
      var eqUrl = equirectUrlForScene(sceneData);
      var eqWidth =
        typeof window.EXHIBITION_EQUIRECT_WIDTH === 'number'
          ? window.EXHIBITION_EQUIRECT_WIDTH
          : 8192;
      source = Marzipano.ImageUrlSource.fromString(eqUrl);
      geometry = new Marzipano.EquirectGeometry([{ width: eqWidth }]);
      limiter = Marzipano.RectilinearView.limit.traditional(
        eqWidth,
        (100 * Math.PI) / 180,
        (120 * Math.PI) / 180
      );
      view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);
      scene = viewer.createScene({
        source: source,
        geometry: geometry,
        view: view,
        pinFirstLevel: false
      });
    }

    (sceneData.linkHotspots || []).forEach(function (hotspot) {
      var el = createNavHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(el, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    (sceneData.workHotspots || []).forEach(function (wh) {
      var el = createArtworkHotspotElement(wh.label, wh.href);
      scene.hotspotContainer().createHotspot(el, { yaw: wh.yaw, pitch: wh.pitch });
    });

    return { data: sceneData, scene: scene, view: view };
  }

  /**
   * Marzipano 默认拖拽松手后仍有惯性滑动；提高摩擦、缩短惯性时间，减少「晃」感。
   * 依赖 Viewer 内部 _controlMethods（与 0.10.x 一致）。
   */
  function applyStableViewControls(viewer) {
    if (!viewer) return;
    try {
      var cm = viewer._controlMethods;
      if (!cm) return;
      var dragFriction = 26;
      var maxFrictionTime = 0.11;
      ['mouseViewDrag', 'touchView'].forEach(function (id) {
        var m = cm[id];
        if (m && m._opts) {
          m._opts.friction = dragFriction;
          m._opts.maxFrictionTime = maxFrictionTime;
        }
      });
    } catch (err) {
      /* ignore if API changes */
    }
  }

  function init(userOptions) {
    options = userOptions || {};
    var data = window.APP_DATA;
    var Marzipano = window.Marzipano;
    var panoEl = document.getElementById('marzipano-viewer');
    if (!data || !Marzipano || !panoEl) {
      try {
        console.error(
          '[Exhibition] Marzipano init failed: missing APP_DATA, Marzipano, or #marzipano-viewer'
        );
      } catch (e) {}
      return;
    }

    scenesByPoint = {};
    sceneWrappers = [];

    var useCubeTiles = window.EXHIBITION_USE_CUBE_TILES === true;
    if (!useCubeTiles) {
      try {
        console.info(
          '[Exhibition] Using equirect panoramas from',
          window.EXHIBITION_EQUIRECT_DIR || '../360/location/',
          '(set window.EXHIBITION_USE_CUBE_TILES = true when marzipano/tiles/ is ready)'
        );
      } catch (e) {}
    }

    var viewerOpts = {
      controls: {
        mouseViewMode: 'drag',
        dragMode: 'pan'
      }
    };
    viewer = new Marzipano.Viewer(panoEl, viewerOpts);
    applyStableViewControls(viewer);

    sceneWrappers = data.scenes.map(function (sceneData) {
      return createSceneForData(Marzipano, viewer, sceneData, useCubeTiles);
    });

    sceneWrappers.forEach(function (w) {
      var nm = w.data.name;
      if (nm && /^p[1-8]$/.test(String(nm))) {
        scenesByPoint[String(nm)] = w;
      }
    });

  }

  function switchToPoint(pointId) {
    var w = scenesByPoint[pointId];
    if (!w || !viewer) return;
    w.view.setParameters(w.data.initialViewParameters);
    w.scene.switchTo();
  }

  window.ExhibitionMarzipano = {
    init: init,
    switchToPoint: switchToPoint,
    getViewerCanvas: function () {
      var root = document.getElementById('marzipano-viewer');
      return root ? root.querySelector('canvas') : null;
    }
  };
})(window);
