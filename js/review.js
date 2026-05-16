/* review.js - 错词本与复习模块 */
(function() {
  var wrongWords = [];
  var reviewMode = false;
  var reviewIndex = 0;
  var isFlipped = false;

  var ReviewModule = {
    init: function(params) {
      reviewMode = false;
      this.renderList();
    },

    destroy: function() {
      Speech.stop();
    },

    loadWrongWords: function() {
      var progress = Storage.load().wordProgress;
      wrongWords = [];
      var grade = Storage.getUser().grade || '3a';

      for (var wordId in progress) {
        var wp = progress[wordId];
        if ((wp.status === 'review' || wp.wrongCount > 0) && !wp.mastered) {
          var word = VocabDB.getById(wordId);
          if (word) {
            wrongWords.push({
              id: word.id,
              word: word.word,
              meaning: word.meaning,
              phonetic: word.phonetic,
              wrongCount: wp.wrongCount || 0,
              consecutiveCorrect: wp.consecutiveCorrect || 0,
              status: wp.mastered ? '已掌握' : '待复习'
            });
          }
        }
      }
      wrongWords.sort(function(a, b) { return b.wrongCount - a.wrongCount; });
      return wrongWords;
    },

    renderList: function() {
      this.loadWrongWords();
      var container = document.getElementById('page-review');

      if (wrongWords.length === 0) {
        container.innerHTML =
          '<div style="padding:16px 0;">' +
            '<div class="flex-between" style="margin-bottom:16px;">' +
              '<h2 style="font-size:20px;font-weight:600;">错词本</h2>' +
              '<button class="btn btn-ghost btn-sm" onclick="Router.navigate(\'home\')">← 返回</button>' +
            '</div>' +
          '</div>' +
          '<div class="empty-state">' +
            '<div class="empty-icon animate-bounceIn">🌟</div>' +
            '<div class="empty-text">太棒了，没有错词！</div>' +
            '<div style="font-size:12px;color:var(--color-text-light);margin-top:8px;">继续学习，保持好成绩</div>' +
          '</div>';
        return;
      }

      var listHTML = wrongWords.map(function(w) {
        return '<div class="review-item" onclick="ReviewModule.showDetail(\'' + w.id + '\')">' +
          '<div>' +
            '<div class="item-title">' + w.word + '</div>' +
            '<div class="item-subtitle">' + w.meaning + '</div>' +
          '</div>' +
          '<div class="word-detail">' +
            '<span class="badge badge-danger">错' + w.wrongCount + '次</span>' +
          '</div>' +
        '</div>';
      }).join('');

      container.innerHTML =
        '<div style="padding:16px 0;">' +
          '<div class="flex-between" style="margin-bottom:16px;">' +
            '<h2 style="font-size:20px;font-weight:600;">错词本 <span class="badge badge-primary">' + wrongWords.length + '词</span></h2>' +
            '<button class="btn btn-ghost btn-sm" onclick="Router.navigate(\'home\')">← 返回</button>' +
          '</div>' +
          '<div class="review-list">' + listHTML + '</div>' +
          '<button class="btn btn-primary btn-lg btn-block" style="margin-top:24px;" onclick="ReviewModule.startReview()">📖 开始复习错词</button>' +
        '</div>';
    },

    showDetail: function(wordId) {
      var word = VocabDB.getById(wordId);
      if (!word) return;
      var container = document.getElementById('page-review');
      container.innerHTML =
        '<div style="padding:16px 0;">' +
          '<button class="btn btn-ghost btn-sm" onclick="ReviewModule.renderList()">← 返回错词本</button>' +
        '</div>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;">' +
          '<div class="card" style="text-align:center;padding:32px;">' +
            '<div class="word-display">' + word.word + '</div>' +
            '<div class="phonetic-display">' + word.phonetic + '</div>' +
            '<button class="sound-btn" onclick="Speech.speak(\'' + word.word + '\')" style="margin:16px auto;">🔊</button>' +
            '<div class="divider"></div>' +
            '<div class="meaning-display">' + word.meaning + '</div>' +
            (word.sentence ? '<div class="sentence-display">' + word.sentence + '<br>' + (word.sentenceCn || '') + '</div>' : '') +
          '</div>' +
        '</div>';
      Speech.speak(word.word);
    },

    startReview: function() {
      reviewMode = true;
      reviewIndex = 0;
      isFlipped = false;
      this.renderReviewCard();
    },

    renderReviewCard: function() {
      if (reviewIndex >= wrongWords.length) {
        this.renderList();
        return;
      }
      isFlipped = false;
      var w = wrongWords[reviewIndex];
      var word = VocabDB.getById(w.id);
      if (!word) { reviewIndex++; this.renderReviewCard(); return; }

      var container = document.getElementById('page-review');
      container.innerHTML =
        '<div class="learn-header">' +
          '<button class="btn btn-ghost btn-sm" onclick="ReviewModule.renderList()">← 返回</button>' +
          '<span class="learn-progress">复习 ' + (reviewIndex + 1) + '/' + wrongWords.length + '</span>' +
        '</div>' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;">' +
          '<div class="flip-card" id="review-flip-card" onclick="ReviewModule.flipReviewCard()">' +
            '<div class="flip-card-inner">' +
              '<div class="flip-card-front">' +
                '<div class="word-display">' + word.word + '</div>' +
                '<div class="phonetic-display">' + word.phonetic + '</div>' +
                '<button class="sound-btn" onclick="event.stopPropagation();Speech.speak(\'' + word.word + '\')">🔊</button>' +
                '<div style="margin-top:12px;font-size:12px;color:var(--color-text-light);">点击翻转</div>' +
              '</div>' +
              '<div class="flip-card-back">' +
                '<div class="meaning-display">' + word.meaning + '</div>' +
                (word.sentence ? '<div class="sentence-display">' + word.sentence + '<br>' + (word.sentenceCn || '') + '</div>' : '') +
                '<button class="sound-btn" onclick="event.stopPropagation();Speech.speak(\'' + word.word + '\')">🔊</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="learn-actions">' +
          '<button class="btn btn-danger" onclick="ReviewModule.markReviewUnknown()">✗ 还不会</button>' +
          '<button class="btn btn-success" onclick="ReviewModule.markReviewKnown()">✓ 掌握了</button>' +
        '</div>';

      Speech.speak(word.word);
    },

    flipReviewCard: function() {
      var card = document.getElementById('review-flip-card');
      if (card) {
        isFlipped = !isFlipped;
        if (isFlipped) card.classList.add('flipped');
        else card.classList.remove('flipped');
      }
    },

    markReviewKnown: function() {
      var w = wrongWords[reviewIndex];
      var wp = Storage.getWordProgress(w.id);
      wp.consecutiveCorrect = (wp.consecutiveCorrect || 0) + 1;
      wp.correctCount = (wp.correctCount || 0) + 1;
      if (wp.consecutiveCorrect >= 3) {
        wp.mastered = true;
        wp.status = 'mastered';
      }
      Storage.setWordProgress(w.id, wp);
      reviewIndex++;
      this.renderReviewCard();
    },

    markReviewUnknown: function() {
      var w = wrongWords[reviewIndex];
      var wp = Storage.getWordProgress(w.id);
      wp.wrongCount = (wp.wrongCount || 0) + 1;
      wp.consecutiveCorrect = 0;
      Storage.setWordProgress(w.id, wp);
      reviewIndex++;
      this.renderReviewCard();
    },

    addWrongWord: function(wordId) {
      var wp = Storage.getWordProgress(wordId);
      wp.wrongCount = (wp.wrongCount || 0) + 1;
      wp.consecutiveCorrect = 0;
      wp.status = 'review';
      wp.lastReview = new Date().toISOString();
      Storage.setWordProgress(wordId, wp);
    }
  };

  window.ReviewModule = ReviewModule;
})();
