/* speech.js - 发音引擎 */
(function() {
  var synth = window.speechSynthesis;
  var voice = null;
  var rate = 0.8;
  var isSpeaking = false;
  var voiceReady = false;
  var audioCtx = null;
  var userInteracted = false;

  // 创建音频上下文（用于解锁移动设备音频）
  function unlockAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function selectEnglishVoice() {
    if (!synth) return;
    var voices = synth.getVoices();
    if (voices.length === 0) return;

    // 优先选择 Google US English 或类似的高质量语音
    voice = voices.filter(function(v) {
      return v.name.indexOf('Google US English') !== -1 || v.name.indexOf('Samantha') !== -1;
    })[0]
      || voices.filter(function(v) { return v.lang.indexOf('en-US') === 0; })[0]
      || voices.filter(function(v) { return v.lang.indexOf('en-GB') === 0; })[0]
      || voices.filter(function(v) { return v.lang.indexOf('en') === 0; })[0]
      || voices[0];
  }

  function initVoice() {
    if (!synth) return;
    var voices = synth.getVoices();
    if (voices.length > 0) {
      selectEnglishVoice();
      voiceReady = true;
    }
  }

  // 处理 voiceschanged 事件
  if (synth && synth.onvoiceschanged !== undefined) {
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

      // 解锁移动设备音频
      unlockAudio();

      // 确保语音已加载（移动端 voices 可能延迟加载）
      if (!voiceReady || !voice) {
        initVoice();
      }

      // 取消之前的播放
      try {
        synth.cancel();
      } catch(e) {}

      var utterance = new SpeechSynthesisUtterance(text);

      // 设置语音 - 如果 voice 对象可用则使用，否则依赖 lang 属性
      if (voice) {
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
        // 出错时尝试不指定 voice，用默认语音重试
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          setTimeout(function() {
            try {
              var retry = new SpeechSynthesisUtterance(text);
              retry.lang = 'en-US';
              retry.rate = rate;
              retry.volume = 1;
              synth.speak(retry);
            } catch(err) {}
          }, 100);
        }
      };

      // 移动端需要延迟播放，确保上下文已激活
      setTimeout(function() {
        try {
          synth.speak(utterance);
        } catch(e) {
          console.warn('speak() 调用失败:', e);
        }
      }, 100);
    },

    speakChinese: function(text) {
      if (!synth) return;
      unlockAudio();
      try {
        synth.cancel();
      } catch(e) {}
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.volume = 1;
      setTimeout(function() {
        try {
          synth.speak(utterance);
        } catch(e) {}
      }, 100);
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
      return {
        supported: !!synth,
        voicesLoaded: voiceReady,
        voiceCount: synth ? synth.getVoices().length : 0,
        userInteracted: userInteracted
      };
    }
  };

  // 监听用户首次交互，解锁音频（关键！）
  function onFirstInteraction(e) {
    userInteracted = true;
    unlockAudio();

    // 尝试用空语音解锁 speechSynthesis
    if (synth) {
      try {
        var unlock = new SpeechSynthesisUtterance('');
        unlock.volume = 0;
        synth.speak(unlock);
        synth.cancel();
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
