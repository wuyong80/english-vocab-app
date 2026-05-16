/* speech.js - 发音引擎 */
(function() {
  var synth = window.speechSynthesis;
  var voice = null;
  var rate = 0.8;
  var isSpeaking = false;
  var voiceReady = false;
  var userInteracted = false;
  var initAttempts = 0;
  var MAX_INIT_ATTEMPTS = 10;
  var currentAudio = null;

  // ========== 在线语音合成（备用方案）==========
  // 使用 ResponsiveVoice 免费的在线 TTS 服务
  // 加载方式：动态插入 script 标签
  var onlineTTSLoaded = false;
  function loadOnlineTTS() {
    if (onlineTTSLoaded) return;
    onlineTTSLoaded = true;
    var script = document.createElement('script');
    script.src = 'https://code.responsivevoice.org/responsivevoice.js?key=jxDZ13cK';
    script.async = true;
    document.head.appendChild(script);
  }

  function speakOnline(text, lang) {
    if (typeof responsiveVoice !== 'undefined' && responsiveVoice.isPlaying) {
      responsiveVoice.cancel();
    }
    var voiceName = (lang === 'zh') ? 'Chinese Female' : 'UK English Female';
    var rvRate = Math.round(rate * 10) / 10;
    if (typeof responsiveVoice !== 'undefined') {
      responsiveVoice.speak(text, voiceName, {
        rate: rvRate,
        pitch: 1,
        volume: 1
      });
      return true;
    }
    return false;
  }

  // ========== 原生 Web Speech API ==========
  function selectEnglishVoice() {
    if (!synth) return;
    var voices = synth.getVoices();
    if (voices.length === 0) return;

    var isHuaweiBrowser = /HuaweiBrowser|HBPC/i.test(navigator.userAgent);
    if (isHuaweiBrowser) {
      voice = null;
      voiceReady = true;
      return;
    }

    voice = voices.filter(function(v) {
      return v.name.indexOf('Google US English') !== -1 || v.name.indexOf('Samantha') !== -1;
    })[0]
      || voices.filter(function(v) { return v.lang.indexOf('en-US') === 0; })[0]
      || voices.filter(function(v) { return v.lang.indexOf('en-GB') === 0; })[0]
      || voices.filter(function(v) { return v.lang.indexOf('en') === 0; })[0]
      || null;

    voiceReady = true;
  }

  function initVoice() {
    if (!synth) return;
    initAttempts++;
    var voices = synth.getVoices();
    if (voices.length > 0) {
      selectEnglishVoice();
    } else if (initAttempts < MAX_INIT_ATTEMPTS) {
      setTimeout(initVoice, 200);
    }
  }

  if (synth && typeof synth.onvoiceschanged !== 'undefined') {
    synth.onvoiceschanged = function() {
      initVoice();
    };
  }

  // ========== 检测是否应该使用在线语音 ==========
  function shouldUseOnline() {
    // 华为浏览器优先使用在线语音
    if (/HuaweiBrowser|HBPC/i.test(navigator.userAgent)) return true;
    // iOS Safari 也经常有问题
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent)) return true;
    // 如果原生语音完全不可用
    if (!synth) return true;
    // 如果 voices 一直加载不出来
    if (!voiceReady && initAttempts >= MAX_INIT_ATTEMPTS) return true;
    return false;
  }

  // ========== 主语音对象 ==========
  var Speech = {
    supported: true, // 现在总是支持，因为有在线备用

    speak: function(text, callback) {
      isSpeaking = true;

      // 优先尝试在线语音（对华为/iOS 更稳定）
      if (shouldUseOnline()) {
        loadOnlineTTS();
        // 给 script 一点时间加载
        setTimeout(function() {
          var ok = speakOnline(text, 'en');
          if (!ok) {
            // 在线语音还没加载好，再试一次原生
            tryNativeSpeak(text, callback);
          } else {
            isSpeaking = false;
            if (callback) callback();
          }
        }, 300);
        return;
      }

      // 使用原生语音
      tryNativeSpeak(text, callback);
    },

    speakChinese: function(text) {
      isSpeaking = true;
      if (shouldUseOnline()) {
        loadOnlineTTS();
        setTimeout(function() {
          speakOnline(text, 'zh');
          isSpeaking = false;
        }, 300);
        return;
      }

      if (!synth) return;
      try { synth.cancel(); } catch(e) {}
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.volume = 1;
      utterance.onend = function() { isSpeaking = false; };
      utterance.onerror = function() { isSpeaking = false; };
      setTimeout(function() {
        try { synth.speak(utterance); } catch(e) {}
      }, 100);
    },

    setSpeed: function(r) {
      rate = Math.max(0.5, Math.min(2, r));
    },

    stop: function() {
      if (synth) {
        try { synth.cancel(); } catch(e) {}
      }
      if (typeof responsiveVoice !== 'undefined') {
        try { responsiveVoice.cancel(); } catch(e) {}
      }
      if (currentAudio) {
        try { currentAudio.pause(); currentAudio = null; } catch(e) {}
      }
      isSpeaking = false;
    },

    getIsSpeaking: function() { return isSpeaking; },

    init: function() {
      initVoice();
      loadOnlineTTS();
    },

    checkSupport: function() {
      return {
        supported: true,
        voicesLoaded: voiceReady,
        voiceCount: synth ? synth.getVoices().length : 0,
        userInteracted: userInteracted,
        isHuawei: /HuaweiBrowser|HBPC/i.test(navigator.userAgent),
        onlineReady: typeof responsiveVoice !== 'undefined'
      };
    }
  };

  // 原生语音播放函数
  function tryNativeSpeak(text, callback) {
    if (!synth) {
      isSpeaking = false;
      if (callback) callback();
      return;
    }

    if (!voiceReady) {
      initVoice();
    }

    try { synth.cancel(); } catch(e) {}

    var utterance = new SpeechSynthesisUtterance(text);
    if (voice && !/HuaweiBrowser|HBPC/i.test(navigator.userAgent)) {
      utterance.voice = voice;
    }
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    utterance.onstart = function() { isSpeaking = true; };
    utterance.onend = function() {
      isSpeaking = false;
      if (callback) callback();
    };
    utterance.onerror = function(e) {
      isSpeaking = false;
      console.warn('原生语音错误:', e.error);
      // 原生失败，尝试在线语音
      loadOnlineTTS();
      setTimeout(function() {
        speakOnline(text, 'en');
      }, 300);
    };

    var delay = /HuaweiBrowser|HBPC/i.test(navigator.userAgent) ? 300 : 100;
    setTimeout(function() {
      try {
        synth.speak(utterance);
      } catch(e) {
        console.warn('speak() 调用失败:', e);
        isSpeaking = false;
        // 尝试在线语音
        loadOnlineTTS();
        setTimeout(function() {
          speakOnline(text, 'en');
        }, 300);
      }
    }, delay);
  }

  // 监听用户首次交互
  function onFirstInteraction(e) {
    userInteracted = true;

    // 激活音频上下文
    try {
      var silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==');
      silentAudio.play().catch(function(){});
    } catch(err) {}

    // 解锁 speechSynthesis
    if (synth) {
      try {
        var unlock = new SpeechSynthesisUtterance(' ');
        unlock.volume = 0.01;
        unlock.rate = 2;
        synth.speak(unlock);
      } catch(err) {}
    }

    // 预加载在线语音
    loadOnlineTTS();
    initVoice();

    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('click', onFirstInteraction);
  }

  document.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
  document.addEventListener('click', onFirstInteraction, { once: true, passive: true });

  // 页面加载时预加载
  loadOnlineTTS();
  initVoice();

  window.Speech = Speech;
})();
