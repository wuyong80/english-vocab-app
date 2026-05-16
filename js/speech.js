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

  function selectEnglishVoice() {
    if (!synth) return;
    var voices = synth.getVoices();
    if (voices.length === 0) return;

    // 华为浏览器特殊处理：不要指定 voice，让系统用默认语音
    // 华为浏览器的 voice 对象经常有问题，直接用 lang 更稳定
    var isHuaweiBrowser = /HuaweiBrowser|HBPC/i.test(navigator.userAgent);
    if (isHuaweiBrowser) {
      voice = null;
      voiceReady = true;
      return;
    }

    // 其他浏览器：尝试选择英语语音
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
      // voices 还没加载好，稍后重试
      setTimeout(initVoice, 200);
    }
  }

  // 处理 voiceschanged 事件
  if (synth && typeof synth.onvoiceschanged !== 'undefined') {
    synth.onvoiceschanged = function() {
      initVoice();
    };
  }

  var Speech = {
    supported: !!synth,

    speak: function(text, callback) {
      if (!synth) {
        console.warn('语音合成不支持');
        return;
      }

      // 确保语音已加载
      if (!voiceReady) {
        initVoice();
      }

      // 取消之前的播放
      try {
        synth.cancel();
      } catch(e) {}

      var utterance = new SpeechSynthesisUtterance(text);

      // 华为浏览器：不设置 voice，只设置 lang
      // 其他浏览器：如果 voice 可用则设置
      if (voice && !/HuaweiBrowser|HBPC/i.test(navigator.userAgent)) {
        utterance.voice = voice;
      }

      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1;
      utterance.lang = 'en-US';

      utterance.onstart = function() { isSpeaking = true; };
      utterance.onend = function() { isSpeaking = false; if (callback) callback(); };
      utterance.onerror = function(e) {
        isSpeaking = false;
        console.warn('语音播放错误:', e.error);
      };

      // 华为浏览器需要更长的延迟
      var delay = /HuaweiBrowser|HBPC/i.test(navigator.userAgent) ? 300 : 100;
      setTimeout(function() {
        try {
          synth.speak(utterance);
        } catch(e) {
          console.warn('speak() 调用失败:', e);
        }
      }, delay);
    },

    speakChinese: function(text) {
      if (!synth) return;
      try {
        synth.cancel();
      } catch(e) {}
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.volume = 1;
      var delay = /HuaweiBrowser|HBPC/i.test(navigator.userAgent) ? 300 : 100;
      setTimeout(function() {
        try {
          synth.speak(utterance);
        } catch(e) {}
      }, delay);
    },

    setSpeed: function(r) {
      rate = Math.max(0.5, Math.min(2, r));
    },

    stop: function() {
      if (synth) {
        try {
          synth.cancel();
        } catch(e) {}
      }
      isSpeaking = false;
    },

    getIsSpeaking: function() { return isSpeaking; },

    init: function() { initVoice(); },

    // 检查是否支持语音
    checkSupport: function() {
      var voices = synth ? synth.getVoices() : [];
      return {
        supported: !!synth,
        voicesLoaded: voiceReady,
        voiceCount: voices.length,
        userInteracted: userInteracted,
        isHuawei: /HuaweiBrowser|HBPC/i.test(navigator.userAgent)
      };
    }
  };

  // 监听用户首次交互，解锁音频（关键！）
  function onFirstInteraction(e) {
    userInteracted = true;

    // 用一个小技巧激活华为浏览器的音频权限
    // 播放一个极短的无声音频来解锁
    try {
      var silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==');
      silentAudio.play().catch(function(){});
    } catch(err) {}

    // 尝试用空语音解锁 speechSynthesis
    if (synth) {
      try {
        var unlock = new SpeechSynthesisUtterance(' ');
        unlock.volume = 0.01;
        unlock.rate = 2;
        synth.speak(unlock);
      } catch(err) {}
    }

    // 初始化语音列表
    initVoice();

    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('click', onFirstInteraction);
  }

  document.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
  document.addEventListener('click', onFirstInteraction, { once: true, passive: true });

  // 页面加载时尝试初始化
  initVoice();

  window.Speech = Speech;
})();
