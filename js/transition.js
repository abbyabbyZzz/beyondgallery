/* ===== Astrolabe Transition ===== */
(function () {
  // Create overlay DOM
  var overlay = document.createElement('div');
  overlay.id = 'transition-overlay';
  overlay.innerHTML =
    '<canvas id="transition-canvas"></canvas>' +
    '<div id="transition-label">loading...</div>';
  document.body.appendChild(overlay);

  var canvas = document.getElementById('transition-canvas');
  var ctx = canvas.getContext('2d');
  var labelEl = document.getElementById('transition-label');
  var rotation = 0;
  var spinSpeed = 0;
  var bgAlpha = 0;
  var phase = 'idle'; // idle | entering | spinning | exiting
  var mode = 'transition'; // 'transition' | 'idleOverlay'
  var animId = null;
  var targetHref = '';
  var navigateTimeoutId = null;

  function clearNavigateTimeout() {
    if (navigateTimeoutId != null) {
      clearTimeout(navigateTimeoutId);
      navigateTimeoutId = null;
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function drawRing(cx, cy, rx, ry, rot, alpha, lw, dashed) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
    ctx.lineWidth = lw;
    if (dashed) ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawDot(x, y, r, alpha) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
    ctx.fill();
  }

  function drawTick(x, y, angle, len, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }

  function animate() {
    if (phase === 'idle') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Phase logic
    if (phase === 'entering') {
      bgAlpha = Math.min(bgAlpha + 0.045, 1);
      spinSpeed = Math.min(spinSpeed + 0.0005, 0.02);
      if (bgAlpha >= 0.95) phase = 'spinning';
    } else if (phase === 'spinning') {
      if (mode === 'idleOverlay') {
        // sound page 背景：保持一个比较舒适的恒定转速
        spinSpeed = 0.015;
      } else {
        spinSpeed = Math.min(spinSpeed + 0.001, 0.04);
      }
    } else if (phase === 'exiting') {
      bgAlpha = Math.max(bgAlpha - 0.03, 0);
      spinSpeed = Math.max(spinSpeed - 0.0005, 0.005);
      if (bgAlpha <= 0.01) {
        phase = 'idle';
        overlay.classList.remove('active');
        cancelAnimationFrame(animId);
        return;
      }
    }

    rotation += spinSpeed;

    // Background
    ctx.fillStyle = 'rgba(5,5,8,' + bgAlpha + ')';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var a = bgAlpha;
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    // idleOverlay 模式（Enter with sound 页面）把星盘放大一些
    var baseSize =
      mode === 'idleOverlay'
        ? Math.min(canvas.width, canvas.height) * 0.38
        : Math.min(canvas.width, canvas.height) * 0.18;

    // Outer ring
    drawRing(cx, cy, baseSize, baseSize, 0, a * 0.5, 1, false);
    // Tilted ellipse rings
    drawRing(cx, cy, baseSize * 0.85, baseSize * 0.4, rotation, a * 0.45, 0.8, false);
    drawRing(cx, cy, baseSize * 0.75, baseSize * 0.35, -rotation * 0.7 + 1.2, a * 0.4, 0.8, false);
    // Dashed inner
    drawRing(cx, cy, baseSize * 0.5, baseSize * 0.5, rotation * 0.3, a * 0.3, 0.5, true);
    // Smallest ring
    drawRing(cx, cy, baseSize * 0.2, baseSize * 0.2, 0, a * 0.5, 0.6, false);

    // Center dot + glow
    drawDot(cx, cy, 3, a * 0.9);
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
    glow.addColorStop(0, 'rgba(255,255,255,' + a * 0.15 + ')');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Dots on ring 2
    for (var i = 0; i < 8; i++) {
      var ang = (i / 8) * Math.PI * 2 + rotation;
      var dx = cx + Math.cos(ang) * baseSize * 0.85;
      var dy = cy + Math.sin(ang) * Math.sin(rotation) * baseSize * 0.4;
      drawDot(dx, dy, 1.8, a * (0.3 + Math.sin(ang + rotation) * 0.2));
    }
    // Dots on ring 3
    for (var j = 0; j < 6; j++) {
      var ang2 = (j / 6) * Math.PI * 2 - rotation * 0.7 + 1.2;
      var dx2 = cx + Math.cos(ang2) * baseSize * 0.75;
      var dy2 = cy + Math.sin(ang2) * Math.sin(-rotation * 0.7 + 1.2) * baseSize * 0.35;
      drawDot(dx2, dy2, 1.5, a * (0.25 + Math.cos(ang2 - rotation) * 0.15));
    }

    // Compass ticks
    for (var k = 0; k < 36; k++) {
      var ta = (k / 36) * Math.PI * 2;
      var tx = cx + Math.cos(ta) * baseSize;
      var ty = cy + Math.sin(ta) * baseSize;
      drawTick(tx, ty, ta + Math.PI, k % 3 === 0 ? 8 : 4, a * 0.25);
    }

    // Cross-hairs
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation * 0.15);
    ctx.beginPath();
    ctx.moveTo(-baseSize * 0.15, 0);
    ctx.lineTo(baseSize * 0.15, 0);
    ctx.moveTo(0, -baseSize * 0.15);
    ctx.lineTo(0, baseSize * 0.15);
    ctx.strokeStyle = 'rgba(255,255,255,' + a * 0.2 + ')';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();

    animId = requestAnimationFrame(animate);
  }

  // 在不跳转页面时单独让星盘进入“持续旋转”状态（比如首页的 sound 选择页）
  window.startIdleAstrolabe = function () {
    if (phase !== 'idle') return;
    mode = 'idleOverlay';
    phase = 'spinning';
    bgAlpha = 0.9;
    spinSpeed = 0.015;
    rotation = 0;
    overlay.classList.add('active');
    if (labelEl) {
      labelEl.style.display = 'none';
    }
    resize();
    animate();
  };

  // 停止上面的空闲星盘动画
  window.stopIdleAstrolabe = function () {
    if (phase === 'idle') return;
    phase = 'idle';
    bgAlpha = 0;
    spinSpeed = 0;
    overlay.classList.remove('active');
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Navigate with transition
  window.navigateWithTransition = function (href) {
    clearNavigateTimeout();

    // 任意非 idle（退场 / 上一段转场尚未结束）时若直接 return，左右箭头会失灵；
    // 取消待执行的跳转并重置星盘后再开始新一次过渡。
    if (phase !== 'idle') {
      window.stopIdleAstrolabe();
    }

    var idFromHref = String(href).match(/[?&#]id=(\d+)/i);
    if (idFromHref) {
      try {
        sessionStorage.setItem('gallery_last_work_id', idFromHref[1]);
      } catch (e) {}
    }

    try {
      sessionStorage.setItem('gallery_transitioning', '1');
    } catch (e) {}
    mode = 'transition';
    targetHref = href;
    phase = 'entering';
    bgAlpha = 0;
    spinSpeed = 0;
    rotation = 0;
    overlay.classList.add('active');
    if (labelEl) {
      labelEl.style.display = '';
    }
    resize();
    animate();

    // 如果有 BGM，则在切页前做一个简单的音量渐变
    if (typeof window.__bgmFadeForTransition === 'function') {
      try {
        window.__bgmFadeForTransition();
      } catch (e) {}
    }

    // Navigate after the entering + spin phase
    navigateTimeoutId = setTimeout(function () {
      navigateTimeoutId = null;
      window.location.href = targetHref;
    }, 1400);
  };

  // On page load: check if we came from a transition
  if (sessionStorage.getItem('gallery_transitioning') === '1') {
    sessionStorage.removeItem('gallery_transitioning');
    // Show exiting animation
    phase = 'exiting';
    bgAlpha = 1;
    spinSpeed = 0.03;
    rotation = 3;
    overlay.classList.add('active');
    resize();
    animate();
  }
})();
