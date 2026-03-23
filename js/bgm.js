;(function () {
  function initBgm() {
    var audio = document.getElementById('bgm-audio')

    // 如果页面里没有预先放好的 audio（例如 home / about），就动态创建一个
    if (!audio) {
      audio = document.createElement('audio')
      audio.id = 'bgm-audio'
      audio.src = 'bgm.mp3'
      audio.loop = true
      audio.preload = 'auto'
      audio.style.display = 'none'
      document.body.appendChild(audio)
    }

    audio.volume = 1

    var preferenceSet = false
    try {
      preferenceSet = sessionStorage.getItem('bgmPreferenceSet') === '1'
    } catch (e) {}

    // 还原上次播放进度
    try {
      var savedTime = sessionStorage.getItem('bgmTime')
      if (savedTime) {
        var t = parseFloat(savedTime)
        if (!isNaN(t) && t >= 0) {
          audio.currentTime = t
        }
      }
    } catch (e) {}

    // 还原静音状态（如果用户已经选择过偏好）
    var muted = false
    try {
      muted = sessionStorage.getItem('bgmMuted') === '1'
    } catch (e) {}

    if (!preferenceSet) {
      // 还没做“有声/无声体验”选择时，默认静音，不自动播放
      audio.muted = true
      audio.volume = 0
    } else {
      audio.muted = muted
      audio.volume = muted ? 0 : 1
    }

    // 创建 / 复用左下角静音按钮
    var btn = document.getElementById('bgm-toggle')
    if (!btn) {
      btn = document.createElement('button')
      btn.id = 'bgm-toggle'
      btn.className = 'bgm-toggle'
      document.body.appendChild(btn)
    }

    function refreshLabel() {
      if (audio.muted || audio.volume === 0) {
        btn.textContent = 'BGM OFF'
        btn.setAttribute('data-muted', '1')
      } else {
        btn.textContent = 'BGM ON'
        btn.setAttribute('data-muted', '0')
      }
    }

    // 简单的音量渐变工具
    var fadeTimer = null
    function fadeVolume(target, duration, onDone) {
      if (fadeTimer) {
        cancelAnimationFrame(fadeTimer)
        fadeTimer = null
      }
      target = Math.max(0, Math.min(1, target))
      var start = audio.volume
      var startTime = performance.now()

      function step(now) {
        var t = duration <= 0 ? 1 : Math.min((now - startTime) / duration, 1)
        audio.volume = start + (target - start) * t
        if (t < 1) {
          fadeTimer = requestAnimationFrame(step)
        } else {
          fadeTimer = null
          if (target === 0) {
            audio.muted = true
          }
          if (typeof onDone === 'function') onDone()
        }
      }

      if (duration <= 0) {
        audio.volume = target
        if (target === 0) audio.muted = true
        if (typeof onDone === 'function') onDone()
        return
      }

      fadeTimer = requestAnimationFrame(step)
    }

    refreshLabel()

    // 暴露一个给首页 / 其它脚本用的接口：应用用户偏好（有声 / 无声）
    window.__bgmApplyPreference = function (wantMuted) {
      preferenceSet = true
      try {
        sessionStorage.setItem('bgmPreferenceSet', '1')
        sessionStorage.setItem('bgmMuted', wantMuted ? '1' : '0')
      } catch (e) {}

      if (wantMuted) {
        // 渐变到 0
        fadeVolume(0, 400, function () {
          audio.muted = true
          refreshLabel()
        })
      } else {
        audio.muted = false
        audio.volume = Math.max(audio.volume, 0.05)
        audio
          .play()
          .then(function () {
            fadeVolume(1, 600, function () {
              refreshLabel()
            })
          })
          .catch(function () {
            // 如果被拦截，就直接标记为 ON，让用户再点一次按钮也能播放
            refreshLabel()
          })
      }
    }

    // 页面切换时的渐变用（由 transition.js 调用）
    window.__bgmFadeForTransition = function () {
      if (audio.muted || audio.volume === 0) return
      fadeVolume(0, 500)
    }

    btn.addEventListener('click', function () {
      var nowMuted = audio.muted || audio.volume === 0
      if (nowMuted) {
        // 从无声切到有声
        window.__bgmApplyPreference(false)
      } else {
        // 从有声切到无声
        window.__bgmApplyPreference(true)
      }
    })

    // 记录播放进度，跨页面恢复
    audio.addEventListener('timeupdate', function () {
      try {
        sessionStorage.setItem('bgmTime', String(audio.currentTime))
      } catch (e) {}
    })

    // 如果已经有明确偏好且是“有声”，尝试自动播放（遵守静音）
    if (!audio.muted && preferenceSet) {
      audio
        .play()
        .then(function () {})
        .catch(function () {
          // 如果被拦截，不做额外提示，用户可以通过按钮开启
        })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBgm)
  } else {
    initBgm()
  }
})()

