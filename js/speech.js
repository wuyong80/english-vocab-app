/* speech.js - 发音引擎 */
(function() {
  var synth = window.speechSynthesis;
  var voice = null;
  var rate = 0.8;
  var isSpeaking = false;
  var voiceReady = false;
  var audioCtx = null;

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
    var voices = synth.getVoices();
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
    if (synth.getVoices().length > 0) {
      selectEnglishVoice();
      voiceReady = true;
    } else if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = function() {
        selectEnglishVoice();
        voiceReady = true;
      };
    }
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

      // 确保语音已加载
      if (!voiceReady || !voice) {
        initVoice();
      }

      synth.cancel();

      var utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1;
      utterance.lang = 'en-US';

      utterance.onstart = function() { isSpeaking = true; };
      utterance.onend = function() { isSpeaking = false; if (callback) callback(); };
      utterance.onerror = function(e) {
        isSpeaking = false;
        console.warn('语音播放错误:', e.error);
        // 尝试用默认语音重试一次
        if (voice && e.error !== 'canceled') {
          var retry = new SpeechSynthesisUtterance(text);
          retry.lang = 'en-US';
          retry.rate = rate;
          retry.volume = 1;
          synth.speak(retry);
        }
      };

      // 移动端需要延迟一点再播放，确保上下文已激活
      setTimeout(function() {
        synth.speak(utterance);
      }, 50);
    },

    speakChinese: function(text) {
      if (!synth) return;
      unlockAudio();
      synth.cancel();
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.volume = 1;
      synth.speak(utterance);
    },

    setSpeed: function(r) {
      rate = Math.max(0.5, Math.min(2, r));
    },

    stop: function() {
      if (synth) synth.cancel();
      isSpeaking = false;
    },

    getIsSpeaking: function() { return isSpeaking; },

    init: function() { initVoice(); }
  };

  // 监听用户首次交互，解锁音频
  function onFirstInteraction() {
    unlockAudio();
    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('click', onFirstInteraction);
  }
  document.addEventListener('touchstart', onFirstInteraction, { once: true });
  document.addEventListener('click', onFirstInteraction, { once: true });

  initVoice();
  window.Speech = Speech;
})();
