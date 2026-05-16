/* spell.js - 拼写模式模块 */
(function() {
  var spellWords = [];
  var currentIndex = 0;
  var currentWord = null;
  var inputLetters = [];
  var letterIndex = 0;
  var hasError = false;
  var sessionStats = { correct: 0, wrong: 0 };

  var SpellModule = {
    init: function() {
      var grade = Storage.getUser().grade || '3a';
      spellWords = VocabDB.getWords(grade, null);
      shuffle(spellWords);
      currentIndex = 0;
      sessionStats = { correct: 0, wrong: 0 };
      this.renderWord();
    },

    destroy: function() {
      Speech.stop();
    },

    renderWord: function() {
      if (currentIndex >= Math.min(spellWords.length, 10)) {
        this.showResult();
        return;
      }
      currentWord = spellWords[currentIndex];
      inputLetters = [];
      letterIndex = 0;
      hasError = false;

      // 延迟发音，华为浏览器需要更长延迟
      var isHuawei = /HuaweiBrowser|HBPC/i.test(navigator.userAgent);
      setTimeout(function() {
        Speech.speak(currentWord.word);
      }, isHuawei ? 800 : 600);

      var container = document.getElementById('page-spell');
      var letterSlots = '';
      for (var i = 0; i < currentWord.word.length; i++) {
        letterSlots += '<span class="letter-slot" id="slot-' + i + '">' + (i === 0 ? '<span style="animation:blink 1s infinite;color:var(--color-primary);">|</span>' : '') + '</span>';
      }

      container.innerHTML =
        '<div class="learn-header">' +
          '<button class="btn btn-ghost btn-sm" onclick="Router.navigate(\'home\')">← 返回</button>' +
          '<span class="learn-progress">第 ' + (currentIndex + 1) + ' 题</span>' +
        '</div>' +
        '<div class="spell-hint">' +
          '<button class="sound-btn" style="margin:0 auto 16px;" onclick="Speech.speak(\'' + currentWord.word + '\')">🔊 再听一次</button>' +
          '<div class="hint-meaning">' + currentWord.meaning + '</div>' +
          '<div class="hint-phonetic">' + currentWord.phonetic + '</div>' +
        '</div>' +
        '<div class="letter-slots" id="letter-slots">' + letterSlots + '</div>' +
        '<div class="virtual-keyboard" id="virtual-keyboard">' +
          '<div class="keyboard-row">' +
            'qwertyuiop'.split('').map(function(l) { return '<button class="key-btn" onclick="SpellModule.inputLetter(\'' + l + '\')">' + l + '</button>'; }).join('') +
          '</div>' +
          '<div class="keyboard-row">' +
            'asdfghjkl'.split('').map(function(l) { return '<button class="key-btn" onclick="SpellModule.inputLetter(\'' + l + '\')">' + l + '</button>'; }).join('') +
          '</div>' +
          '<div class="keyboard-row">' +
            '<button class="key-btn key-wide" onclick="SpellModule.backspace()">⌫</button>' +
            'zxcvbnm'.split('').map(function(l) { return '<button class="key-btn" onclick="SpellModule.inputLetter(\'' + l + '\')">' + l + '</button>'; }).join('') +
          '</div>' +
          '<div class="keyboard-row" style="justify-content:center;gap:8px;">' +
            '<button class="key-btn key-wide" onclick="Speech.speak(\'' + currentWord.word + '\')">🔊</button>' +
            '<button class="key-btn key-wide" onclick="SpellModule.skipWord()">跳过 →</button>' +
          '</div>' +
        '</div>';
    },

    inputLetter: function(letter) {
      if (hasError || !currentWord) return;
      var correctLetter = currentWord.word[letterIndex].toLowerCase();
      var isCorrect = letter === correctLetter;

      var slot = document.getElementById('slot-' + letterIndex);
      if (!slot) return;

      inputLetters.push(letter);
      slot.innerHTML = letter.toUpperCase();

      if (isCorrect) {
        slot.classList.add('filled', 'correct');
        letterIndex++;
        // 更新光标
        var nextSlot = document.getElementById('slot-' + letterIndex);
        if (nextSlot) nextSlot.innerHTML = '<span style="animation:blink 1s infinite;color:var(--color-primary);">|</span>';

        if (letterIndex >= currentWord.word.length) {
          // 拼写完成
          sessionStats.correct++;
          var self = this;
          setTimeout(function() {
            self.showWordResult(true);
          }, 500);
        }
      } else {
        slot.classList.add('filled', 'wrong');
        hasError = true;
        sessionStats.wrong++;
        ReviewModule.addWrongWord(currentWord.id);
        var self = this;
        setTimeout(function() {
          self.showWordResult(false);
        }, 1000);
      }
    },

    backspace: function() {
      if (letterIndex > 0 && !hasError) {
        letterIndex--;
        inputLetters.pop();
        var slot = document.getElementById('slot-' + letterIndex);
        if (slot) {
          slot.innerHTML = letterIndex === 0 ? '<span style="animation:blink 1s infinite;color:var(--color-primary);">|</span>' : '';
          slot.classList.remove('filled', 'correct');
        }
      }
    },

    skipWord: function() {
      sessionStats.wrong++;
      this.showWordResult(false);
    },

    showWordResult: function(isCorrect) {
      var container = document.getElementById('page-spell');
      container.innerHTML =
        '<div class="summary-page animate-fadeIn">' +
          '<div class="summary-icon">' + (isCorrect ? '✅' : '❌') + '</div>' +
          '<div class="word-display" style="margin:16px 0;">' + currentWord.word + '</div>' +
          '<div class="meaning-display">' + currentWord.meaning + '</div>' +
          '<div class="sentence-display">' + (currentWord.sentence || '') + '</div>' +
          '<button class="sound-btn" style="margin:16px auto;" onclick="Speech.speak(\'' + currentWord.word + '\')">🔊</button>' +
          '<div style="display:flex;gap:12px;margin-top:24px;">' +
            '<button class="btn btn-primary btn-lg btn-block" onclick="SpellModule.nextWord()">下一个 →</button>' +
          '</div>' +
        '</div>';
    },

    nextWord: function() {
      currentIndex++;
      this.renderWord();
    },

    showResult: function() {
      var total = sessionStats.correct + sessionStats.wrong;
      var rate = total > 0 ? Math.round(sessionStats.correct / total * 100) : 0;
      var container = document.getElementById('page-spell');
      container.innerHTML =
        '<div class="summary-page animate-fadeIn">' +
          '<div class="summary-icon">✍️</div>' +
          '<div class="summary-title">拼写练习完成！</div>' +
          '<div class="summary-stats">' +
            '<div class="summary-stat"><div class="val">' + total + '</div><div class="label">拼写单词</div></div>' +
            '<div class="summary-stat"><div class="val" style="color:var(--color-success)">' + rate + '%</div><div class="label">正确率</div></div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px;margin-top:24px;">' +
            '<button class="btn btn-primary btn-lg btn-block" onclick="SpellModule.init()">✍️ 再练一组</button>' +
            '<button class="btn btn-ghost btn-lg btn-block" onclick="Router.navigate(\'home\')">🏠 返回首页</button>' +
          '</div>' +
        '</div>';
    }
  };

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  window.SpellModule = SpellModule;
})();
