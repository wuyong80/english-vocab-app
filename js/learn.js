/* learn.js - 单词卡片学习模块 */
(function() {
  var currentWords = [];
  var currentIndex = 0;
  var groupSize = 10;
  var sessionStats = { correct: 0, wrong: 0, words: [] };
  var isFlipped = false;
  var startTime = null;

  var LearnModule = {
    init: function(params) {
      var grade = Storage.getUser().grade || '3a';
      currentWords = this.selectGroup(grade, null, groupSize);
      if (currentWords.length === 0) {
        this.renderEmpty();
        return;
      }
      currentIndex = 0;
      sessionStats = { correct: 0, wrong: 0, words: [] };
      startTime = Date.now();
      this.renderCard();
    },

    destroy: function() {
      Speech.stop();
    },

    selectGroup: function(grade, unit, size) {
      var allWords = VocabDB.getWords(grade, unit);
      var progress = Storage.load().wordProgress;

      var reviewWords = allWords.filter(function(w) {
        var wp = progress[w.id];
        return wp && wp.status === 'review' && !wp.mastered;
      });

      var newWords = allWords.filter(function(w) {
        var wp = progress[w.id];
        return !wp || wp.status === 'new';
      });

      // 洗牌
      shuffle(reviewWords);
      shuffle(newWords);

      var group = [];
      var reviewCount = Math.min(reviewWords.length, 3);
      group = group.concat(reviewWords.slice(0, reviewCount));
      var newCount = size - group.length;
      group = group.concat(newWords.slice(0, newCount));

      shuffle(group);
      return group;
    },

    renderCard: function() {
      if (currentIndex >= currentWords.length) {
        this.showSummary();
        return;
      }
      isFlipped = false;
      var word = currentWords[currentIndex];
      var progress = Storage.getWordProgress(word.id);
      var container = document.getElementById('page-learn');

      container.innerHTML =
        '<div class="learn-header">' +
          '<button class="btn btn-ghost btn-sm" onclick="Router.navigate(\'home\')">← 返回</button>' +
          '<span class="learn-progress">' + (currentIndex + 1) + ' / ' + currentWords.length + '</span>' +
        '</div>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;">' +
          '<div class="flip-card" id="flip-card" onclick="LearnModule.flipCard()">' +
            '<div class="flip-card-inner">' +
              '<div class="flip-card-front">' +
                '<div class="word-display">' + word.word + '</div>' +
                '<div class="phonetic-display">' + word.phonetic + '</div>' +
                '<button class="sound-btn" onclick="event.stopPropagation();Speech.speak(\'' + word.word + '\')">' +
                  '🔊' +
                '</button>' +
                '<div style="margin-top:16px;font-size:12px;color:var(--color-text-light);">点击卡片翻转</div>' +
              '</div>' +
              '<div class="flip-card-back">' +
                '<div class="meaning-display">' + word.meaning + '</div>' +
                (word.partOfSpeech ? '<div style="font-size:12px;color:var(--color-text-light);margin-top:4px;">' + word.partOfSpeech + '</div>' : '') +
                (word.sentence ? '<div class="sentence-display">' + word.sentence + '<br>' + (word.sentenceCn || '') + '</div>' : '') +
                '<button class="sound-btn" onclick="event.stopPropagation();Speech.speak(\'' + word.word + '\')">' +
                  '🔊' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="learn-actions">' +
          '<button class="btn btn-danger" onclick="LearnModule.markUnknown()">✗ 不认识</button>' +
          '<button class="btn btn-success" onclick="LearnModule.markKnown()">✓ 认识</button>' +
        '</div>';

      // 自动发音（延迟确保移动设备音频上下文已解锁）
      setTimeout(function() { Speech.speak(word.word); }, 500);
    },

    flipCard: function() {
      var card = document.getElementById('flip-card');
      if (card) {
        isFlipped = !isFlipped;
        if (isFlipped) { card.classList.add('flipped'); }
        else { card.classList.remove('flipped'); }
      }
    },

    markKnown: function() {
      var word = currentWords[currentIndex];
      var wp = Storage.getWordProgress(word.id);
      wp.correctCount = (wp.correctCount || 0) + 1;
      wp.consecutiveCorrect = (wp.consecutiveCorrect || 0) + 1;
      wp.lastReview = new Date().toISOString();
      if (wp.consecutiveCorrect >= 3) {
        wp.mastered = true;
        wp.status = 'mastered';
      } else if (wp.status === 'new' || !wp.status) {
        wp.status = 'learning';
      }
      Storage.setWordProgress(word.id, wp);
      sessionStats.correct++;
      sessionStats.words.push(word.id);
      currentIndex++;
      this.recordProgress(1, 0);
      this.renderCard();
    },

    markUnknown: function() {
      var word = currentWords[currentIndex];
      var wp = Storage.getWordProgress(word.id);
      wp.wrongCount = (wp.wrongCount || 0) + 1;
      wp.consecutiveCorrect = 0;
      wp.status = 'review';
      wp.lastReview = new Date().toISOString();
      Storage.setWordProgress(word.id, wp);
      sessionStats.wrong++;
      sessionStats.words.push(word.id);
      currentIndex++;
      this.recordProgress(0, 1);
      this.renderCard();
    },

    recordProgress: function(correct, wrong) {
      var today = new Date().toISOString().split('T')[0];
      Storage.recordDailyLog(today, {
        newWords: 1,
        reviewed: 0,
        totalAttempts: 1,
        correctAttempts: correct,
        words: sessionStats.words.slice(-1)
      });
    },

    showSummary: function() {
      var total = sessionStats.correct + sessionStats.wrong;
      var rate = total > 0 ? Math.round(sessionStats.correct / total * 100) : 0;
      var minutes = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;
      var container = document.getElementById('page-learn');

      container.innerHTML =
        '<div class="summary-page animate-fadeIn">' +
          '<div class="summary-icon">' + (rate >= 80 ? '🎉' : rate >= 50 ? '👍' : '💪') + '</div>' +
          '<div class="summary-title">学习完成！</div>' +
          '<div class="summary-stats">' +
            '<div class="summary-stat"><div class="val">' + total + '</div><div class="label">学习单词</div></div>' +
            '<div class="summary-stat"><div class="val" style="color:var(--color-success)">' + rate + '%</div><div class="label">正确率</div></div>' +
            '<div class="summary-stat"><div class="val">' + minutes + '</div><div class="label">分钟</div></div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px;margin-top:24px;">' +
            '<button class="btn btn-primary btn-lg btn-block" onclick="LearnModule.init()">📖 再学一组</button>' +
            '<button class="btn btn-ghost btn-lg btn-block" onclick="Router.navigate(\'home\')">🏠 返回首页</button>' +
          '</div>' +
        '</div>';
    },

    renderEmpty: function() {
      var container = document.getElementById('page-learn');
      container.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">📚</div>' +
          '<div class="empty-text">当前年级没有更多新单词了</div>' +
          '<button class="btn btn-primary" style="margin-top:24px;" onclick="Router.navigate(\'settings\')">切换年级</button>' +
        '</div>';
    }
  };

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  window.LearnModule = LearnModule;
})();
