/**
 * Marzipano / Hammer 只在控制层节点上监听鼠标；指针移出该区域后收不到 mousemove。
 * 在从控制层按下左键期间，把 document 上的 move/up 转发到控制层，便于在窗口内继续拖拽环景。
 * @param {Object} viewer Marzipano Viewer 实例（需存在 _controlContainer）
 * @returns {function|undefined} 卸载函数，无 viewer 时返回 undefined
 */
(function (window) {
  'use strict';

  function installMarzipanoDocumentMouseDrag(viewer) {
    if (!viewer || !viewer._controlContainer) return undefined;

    var el = viewer._controlContainer;
    var dragging = false;

    function cloneMouseEvent(type, e) {
      try {
        return new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          detail: e.detail,
          screenX: e.screenX,
          screenY: e.screenY,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          button: e.button,
          buttons: e.buttons,
          relatedTarget: e.relatedTarget
        });
      } catch (err) {
        return null;
      }
    }

    function onControlMouseDown(e) {
      if (e.button !== 0) return;
      dragging = true;
    }

    function onDocumentMouseMove(e) {
      if (!dragging || !(e.buttons & 1)) return;
      if (el.contains(e.target)) return;
      var syn = cloneMouseEvent('mousemove', e);
      if (syn) el.dispatchEvent(syn);
    }

    function onDocumentMouseUp(e) {
      if (!dragging || e.button !== 0) return;
      dragging = false;
      if (!el.contains(e.target)) {
        var syn = cloneMouseEvent('mouseup', e);
        if (syn) el.dispatchEvent(syn);
      }
    }

    function onWindowBlur() {
      dragging = false;
    }

    el.addEventListener('mousedown', onControlMouseDown, true);
    document.addEventListener('mousemove', onDocumentMouseMove, true);
    document.addEventListener('mouseup', onDocumentMouseUp, true);
    window.addEventListener('blur', onWindowBlur);

    return function teardown() {
      el.removeEventListener('mousedown', onControlMouseDown, true);
      document.removeEventListener('mousemove', onDocumentMouseMove, true);
      document.removeEventListener('mouseup', onDocumentMouseUp, true);
      window.removeEventListener('blur', onWindowBlur);
      dragging = false;
    };
  }

  window.installMarzipanoDocumentMouseDrag = installMarzipanoDocumentMouseDrag;
})(window);
