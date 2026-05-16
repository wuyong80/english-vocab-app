/* storage.js - localStorage 封装 */
(function() {
  const STORAGE_KEY = 'vocab_app_data';
  const BACKUP_KEY = 'vocab_app_backup';
  const VERSION = 1;
  var saveTimer = null;
  var _cache = null;

  var Storage = {
    VERSION: VERSION,

    getDefaults: function() {
      return {
        version: VERSION,
        user: { name: '小朋友', grade: '3a', dailyGoal: 10, createdAt: null },
        wordProgress: {},
        learningLogs: {},
        achievements: [],
        settings: { voiceSpeed: 1, quizMode: 'mixed', theme: 'light' },
        updatedAt: null
      };
    },

    load: function() {
      if (_cache) return _cache;
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) { _cache = this.getDefaults(); return _cache; }
        var data = JSON.parse(raw);
        if (data.version !== VERSION) {
          data = this.migrate(data);
        }
        _cache = data;
        return data;
      } catch(e) {
        console.warn('数据加载失败，使用默认值', e);
        _cache = this.getDefaults();
        return _cache;
      }
    },

    save: function(data) {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function() {
        try {
          var current = localStorage.getItem(STORAGE_KEY);
          if (current) localStorage.setItem(BACKUP_KEY, current);
          data.version = VERSION;
          data.updatedAt = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          _cache = data;
        } catch(e) {
          console.error('数据保存失败', e);
        }
      }, 500);
    },

    migrate: function(oldData) {
      var defaults = this.getDefaults();
      var merged = {};
      for (var key in defaults) {
        merged[key] = (oldData[key] !== undefined) ? oldData[key] : defaults[key];
      }
      merged.version = VERSION;
      return merged;
    },

    getWordProgress: function(wordId) {
      var data = this.load();
      return data.wordProgress[wordId] || {
        wrongCount: 0, correctCount: 0, mastered: false,
        consecutiveCorrect: 0, lastReview: null, nextReview: null, status: 'new'
      };
    },

    setWordProgress: function(wordId, progress) {
      var data = this.load();
      data.wordProgress[wordId] = progress;
      this.save(data);
    },

    recordDailyLog: function(date, entry) {
      var data = this.load();
      if (!data.learningLogs[date]) {
        data.learningLogs[date] = { newWords: 0, reviewed: 0, totalAttempts: 0, correctAttempts: 0, correctRate: 0, learnedWords: [], studyMinutes: 0 };
      }
      var log = data.learningLogs[date];
      log.newWords += entry.newWords || 0;
      log.reviewed += entry.reviewed || 0;
      log.totalAttempts += entry.totalAttempts || 0;
      log.correctAttempts += entry.correctAttempts || 0;
      if (log.totalAttempts > 0) {
        log.correctRate = Math.round(log.correctAttempts / log.totalAttempts * 100);
      }
      if (entry.words) {
        var set = {};
        (log.learnedWords || []).forEach(function(w) { set[w] = true; });
        entry.words.forEach(function(w) { set[w] = true; });
        log.learnedWords = Object.keys(set);
      }
      log.studyMinutes = (log.studyMinutes || 0) + (entry.minutes || 0);
      this.save(data);
    },

    getUser: function() {
      var data = this.load();
      return data.user;
    },

    setUser: function(user) {
      var data = this.load();
      for (var key in user) { data.user[key] = user[key]; }
      this.save(data);
    },

    getSettings: function() {
      var data = this.load();
      return data.settings;
    },

    setSettings: function(settings) {
      var data = this.load();
      for (var key in settings) { data.settings[key] = settings[key]; }
      this.save(data);
    },

    getAchievements: function() {
      var data = this.load();
      return data.achievements || [];
    },

    unlockAchievement: function(achId) {
      var data = this.load();
      var found = false;
      data.achievements.forEach(function(a) { if (a.id === achId) found = true; });
      if (!found) {
        data.achievements.push({ id: achId, unlockedAt: new Date().toISOString() });
        this.save(data);
      }
    },

    getLearningLogs: function() {
      var data = this.load();
      return data.learningLogs || {};
    },

    setGrade: function(grade) {
      var data = this.load();
      data.user.grade = grade;
      this.save(data);
    },

    restoreFromBackup: function() {
      var backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        localStorage.setItem(STORAGE_KEY, backup);
        _cache = null;
        return this.load();
      }
      return null;
    },

    clearAll: function() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
      _cache = null;
    }
  };

  window.Storage = Storage;
})();
