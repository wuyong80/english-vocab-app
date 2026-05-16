/* speech.js - 发音引擎 */
(function() {
  var synth = window.speechSynthesis;
  var voice = null;
  var rate = 0.8;
  var isSpeaking = false;
  var voiceReady = false;

  function selectEnglishVoice() {
    var voices = synth.getVoices();
    voice = voices.filter(function(v) { return v.lang.indexOf('en-GB') === 0; })[0]
      || voices.filter(function(v) { return v.lang.indexOf('en-US') === 0; })[0]
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
      if (!synth) return;
      synth.cancel();
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1;
      utterance.lang = 'en-GB';
      utterance.onstart = function() { isSpeaking = true; };
      utterance.onend = function() { isSpeaking = false; if (callback) callback(); };
      utterance.onerror = function() { isSpeaking = false; };
      synth.speak(utterance);
    },

    speakChinese: function(text) {
      if (!synth) return;
      synth.cancel();
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
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

  initVoice();
  window.Speech = Speech;
})();
