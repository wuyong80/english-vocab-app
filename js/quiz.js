/* quiz.js - 选择题测验模块 */
(function() {
  var quizWords = [];
  var currentIndex = 0;
  var totalQuestions = 10;
  var sessionStats = { correct: 0, wrong: 0, score: 0, combo: 0, maxCombo: 0, wrongWords: [] };
  var currentQuestion = null;
  var answered = false;
  var startTime = null;

  var QUIZ_TYPES = ['listen', 'cn-to-en', 'en-to-cn'];

  var QuizModule = {
    init: function(params) {
      var grade = Storage.getUser().grade || '3a';
      quizWords = VocabDB.getWords(grade, null);
      if (quizWords.length < 4) {
        quizWords = VocabDB.getAllWords();
      }
      shuffle(quizWords);
      currentIndex = 0;
      sessionStats = { correct: 0, wrong: 0, score: 0, combo: 0, maxCombo: 0, wrongWords: [] };
      answered = false;
      startTime = Date.now();
      this.renderQuestion();
    },

    destroy: function() {
      Speech.stop();
    },

    renderQuestion: function() {
      if (currentIndex >= totalQuestions) {
        this.showResult();
        return;
      }
      answered = false;
      var typeIndex = currentIndex % 3;
      var type = QUIZ_TYPES[typeIndex];
      var targetWord = quizWords[currentIndex % quizWords.length];
      var distractors = VocabDB.getDistractors(targetWord, 3, 'same-grade');

      var question, options, correctAnswer;

      switch(type) {
        case 'listen':
          question = { type: 'listen', label: '听音选义' };
          options = shuffle([targetWord.meaning].concat(distractors.map(function(d) { return d.meaning; })));
          correctAnswer = targetWord.meaning;
          break;
        case 'cn-to-en':
          question = { type: 'cn-to-en', label: '看义选词', text: targetWord.meaning };
          options = shuffle([targetWord.word].concat(distractors.map(function(d) { return d.word; })));
          correctAnswer = targetWord.word;
          break;
        case 'en-to-cn':
          question = { type: 'en-to-cn', label: '看词选义', text: targetWord.word };
          options = shuffle([targetWord.meaning].concat(distractors.map(function(d) { return d.meaning; })));
          correctAnswer = targetWord.meaning;
          break;
      }

      currentQuestion = { word: targetWord, type: type, options: options, correctAnswer: correctAnswer };

      var container = document.getElementById('page-quiz');
      var questionHTML = '';
      if (type === 'listen') {
        questionHTML =
          '<div class="quiz-question">' +
            '<div class="quiz-type-label">' + question.label + '</div>' +
            '<div style="margin-top:24px;">' +
              '<button class="sound-btn" style="width:72px;height:72px;font-size:32px;" onclick="Speech.speak(\'' + targetWord.word + '\')">🔊</button>' +
            '</div>' +
            '<div class="question-sub" style="margin-top:16px;">点击喇叭听读音，选出对应中文</div>' +
          '</div>';
        setTimeout(function() { Speech.speak(targetWord.word); }, 400);
      } else if (type === 'cn-to-en') {
        questionHTML =
          '<div class="quiz-question">' +
            '<div class="quiz-type-label">' + question.label + '</div>' +
            '<div class="question-text" style="margin-top:24px;">' + targetWord.meaning + '</div>' +
            '<div class="question-sub">选出对应的英文单词</div>' +
          '</div>';
      } else {
        questionHTML =
          '<div class="quiz-question">' +
            '<div class="quiz-type-label">' + question.label + '</div>' +
            '<div class="question-text" style="margin-top:24px;">' + targetWord.word + '</div>' +
            '<div class="question-sub">选出对应的中文意思</div>' +
          '</div>';
      }

      var optionsHTML = '<div class="quiz-options">';
      var labels = ['A', 'B', 'C', 'D'];
      for (var i = 0; i < options.length; i++) {
        optionsHTML += '<button class="option-btn" id="opt-' + i + '" onclick="QuizModule.selectOption(' + i + ')">' + labels[i] + '. ' + options[i] + '</button>';
      }
      optionsHTML += '</div>';

      var progressPct = Math.round(currentIndex / totalQuestions * 100);
      container.innerHTML =
        '<div class="quiz-header">' +
          '<button class="btn btn-ghost btn-sm" onclick="Router.navigate(\'home\')">← 返回</button>' +
          '<span style="font-size:14px;color:var(--color-text-secondary);">' + (currentIndex + 1) + '/' + totalQuestions + '</span>' +
        '</div>' +
        questionHTML +
        optionsHTML +
        '<div style="margin-top:16px;">' +
          '<div class="progress-bar"><div class="progress-fill" style="width:' + progressPct + '%"></div></div>' +
          '<div style="display:flex;justify-content:space-between;margin-top:8px;">' +
            '<span style="font-size:12px;color:var(--color-success);">✓ ' + sessionStats.correct + '</span>' +
            '<span style="font-size:12px;color:var(--color-danger);">✗ ' + sessionStats.wrong + '</span>' +
          '</div>' +
        '</div>';
    },

    selectOption: function(idx) {
      if (answered) return;
      answered = true;
      var selected = currentQuestion.options[idx];
      var isCorrect = selected === currentQuestion.correctAnswer;
      var correctIdx = currentQuestion.options.indexOf(currentQuestion.correctAnswer);

      // 标记选中项
      var btn = document.getElementById('opt-' + idx);
      if (isCorrect) {
        btn.classList.add('correct');
        sessionStats.correct++;
        sessionStats.combo++;
        if (sessionStats.combo > sessionStats.maxCombo) sessionStats.maxCombo = sessionStats.combo;
        var bonus = Math.min(sessionStats.combo - 1, 3) * 2;
        sessionStats.score += 10 + bonus;
      } else {
        btn.classList.add('wrong');
        document.getElementById('opt-' + correctIdx).classList.add('correct');
        sessionStats.wrong++;
        sessionStats.combo = 0;
        // 加入错词本
        var wp = Storage.getWordProgress(currentQuestion.word.id);
        wp.wrongCount = (wp.wrongCount || 0) + 1;
        wp.consecutiveCorrect = 0;
        wp.status = 'review';
        wp.lastReview = new Date().toISOString();
        Storage.setWordProgress(currentQuestion.word.id, wp);
        sessionStats.wrongWords.push(currentQuestion.word);
      }

      // 记录今日
      var today = new Date().toISOString().split('T')[0];
      Storage.recordDailyLog(today, { totalAttempts: 1, correctAttempts: isCorrect ? 1 : 0, words: [currentQuestion.word.id] });

      var self = this;
      setTimeout(function() {
        currentIndex++;
        self.renderQuestion();
      }, 1200);
    },

    showResult: function() {
      var total = sessionStats.correct + sessionStats.wrong;
      var rate = total > 0 ? Math.round(sessionStats.correct / total * 100) : 0;
      var minutes = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
      var container = document.getElementById('page-quiz');

      container.innerHTML =
        '<div class="summary-page animate-fadeIn">' +
          '<div class="summary-icon">' + (rate >= 80 ? '🏆' : rate >= 50 ? '👍' : '💪') + '</div>' +
          '<div class="summary-title">测验完成！</div>' +
          '<div class="summary-stats">' +
            '<div class="summary-stat"><div class="val">' + sessionStats.score + '</div><div class="label">得分</div></div>' +
            '<div class="summary-stat"><div class="val" style="color:var(--color-success)">' + rate + '%</div><div class="label">正确率</div></div>' +
            '<div class="summary-stat"><div class="val">' + sessionStats.maxCombo + '</div><div class="label">最大连击</div></div>' +
          '</div>' +
          (sessionStats.wrongWords.length > 0 ?
            '<div style="margin-top:16px;text-align:left;">' +
              '<div class="section-title">需要复习的单词</div>' +
              sessionStats.wrongWords.map(function(w) {
                return '<div class="list-item"><span class="item-title">' + w.word + '</span><span class="item-subtitle">' + w.meaning + '</span></div>';
              }).join('') +
            '</div>' : '') +
          '<div style="display:flex;flex-direction:column;gap:12px;margin-top:24px;">' +
            '<button class="btn btn-primary btn-lg btn-block" onclick="QuizModule.init()">🎯 再来一轮</button>' +
            '<button class="btn btn-ghost btn-lg btn-block" onclick="Router.navigate(\'home\')">🏠 返回首页</button>' +
          '</div>' +
        '</div>';
    }
  };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  window.QuizModule = QuizModule;
})();
