/* stats.js - 学习统计与打卡模块 */
(function() {
  var StatsModule = {
    init: function() {
      this.render();
    },

    destroy: function() {},

    render: function() {
      var user = Storage.getUser();
      var grade = user.grade || '3a';
      var logs = Storage.getLearningLogs();
      var progress = Storage.load().wordProgress;
      var today = new Date().toISOString().split('T')[0];
      var todayLog = logs[today] || { newWords: 0, reviewed: 0, correctRate: 0, studyMinutes: 0 };

      var totalLearned = 0, totalDays = 0, masteredCount = 0, totalStudyMinutes = 0;
      for (var date in logs) {
        var log = logs[date];
        totalLearned += (log.newWords || 0) + (log.reviewed || 0);
        totalDays++;
        totalStudyMinutes += (log.studyMinutes || 0);
      }
      for (var wordId in progress) {
        if (progress[wordId].mastered) masteredCount++;
      }
      var streakDays = calculateStreak(logs);

      // 成就
      var achievements = getAchievements(masteredCount, streakDays, todayLog);

      var container = document.getElementById('page-stats');
      container.innerHTML =
        '<div style="padding:16px 0;">' +
          '<h2 style="font-size:20px;font-weight:600;margin-bottom:16px;">学习统计</h2>' +

          /* 今日数据 */
          '<div class="stat-row">' +
            '<div class="stat-card"><div class="stat-value">' + ((todayLog.newWords || 0) + (todayLog.reviewed || 0)) + '</div><div class="stat-label">今日学习</div></div>' +
            '<div class="stat-card"><div class="stat-value">' + (todayLog.correctRate || 0) + '%</div><div class="stat-label">今日正确率</div></div>' +
          '</div>' +

          /* 累计数据 */
          '<div class="stat-row">' +
            '<div class="stat-card"><div class="stat-value">' + masteredCount + '</div><div class="stat-label">已掌握</div></div>' +
            '<div class="stat-card"><div class="stat-value">' + streakDays + '</div><div class="stat-label">连续打卡</div></div>' +
            '<div class="stat-card"><div class="stat-value">' + totalDays + '</div><div class="stat-label">学习天数</div></div>' +
          '</div>' +

          /* 打卡日历 */
          '<div class="section-title" style="margin-top:16px;">📅 打卡日历</div>' +
          '<div class="calendar-container" id="calendar-container"></div>' +

          /* 成就 */
          '<div class="section-title" style="margin-top:24px;">🏅 成就徽章</div>' +
          '<div class="achievement-list">' +
            achievements.map(function(a) {
              return '<div class="achievement-item' + (a.unlocked ? '' : ' locked') + '">' +
                '<div class="ach-icon">' + a.icon + '</div>' +
                '<div class="ach-name">' + a.name + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +

        '</div>';

      // 渲染日历
      renderCalendar(new Date().getFullYear(), new Date().getMonth() + 1);

      // 检查并解锁成就
      achievements.forEach(function(a) {
        if (a.unlocked) Storage.unlockAchievement(a.id);
      });
    }
  };

  function calculateStreak(logs) {
    var streak = 0;
    var d = new Date();
    while (true) {
      var dateStr = d.toISOString().split('T')[0];
      if (logs[dateStr] && ((logs[dateStr].newWords || 0) + (logs[dateStr].reviewed || 0)) > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function getAchievements(masteredCount, streakDays, todayLog) {
    var unlockedAchs = Storage.getAchievements();
    var unlockedMap = {};
    unlockedAchs.forEach(function(a) { unlockedMap[a.id] = true; });

    var defs = [
      { id: 'first_word', name: '初来乍到', icon: '🌟', check: masteredCount >= 1 },
      { id: 'ten_words', name: '小试牛刀', icon: '⭐', check: masteredCount >= 10 },
      { id: 'fifty_words', name: '词汇新星', icon: '🏅', check: masteredCount >= 50 },
      { id: 'hundred_words', name: '百词达人', icon: '🏆', check: masteredCount >= 100 },
      { id: 'week_streak', name: '一周坚持', icon: '📅', check: streakDays >= 7 },
      { id: 'perfect', name: '满分达人', icon: '🎯', check: (todayLog.correctRate || 0) === 100 && (todayLog.totalAttempts || 0) >= 5 }
    ];

    return defs.map(function(d) {
      d.unlocked = d.check || !!unlockedMap[d.id];
      return d;
    });
  }

  function renderCalendar(year, month) {
    var logs = Storage.getLearningLogs();
    var firstDay = new Date(year, month - 1, 1).getDay();
    var daysInMonth = new Date(year, month, 0).getDate();
    var today = new Date();

    var html =
      '<div class="calendar-header">' +
        '<button onclick="StatsModule.prevMonth()">◀</button>' +
        '<span class="month-label">' + year + '年' + month + '月</span>' +
        '<button onclick="StatsModule.nextMonth()">▶</button>' +
      '</div>' +
      '<div class="calendar-weekdays">' +
        '<span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>' +
      '</div>' +
      '<div class="calendar-days">';

    for (var i = 0; i < firstDay; i++) {
      html += '<span class="day empty"></span>';
    }
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var isToday = today.getFullYear() === year && today.getMonth() === month - 1 && today.getDate() === day;
      var hasStudy = logs[dateStr] && ((logs[dateStr].newWords || 0) + (logs[dateStr].reviewed || 0)) > 0;
      var cls = 'day';
      if (isToday) cls += ' today';
      if (hasStudy) cls += ' studied';
      html += '<span class="' + cls + '">' + day + '</span>';
    }
    html += '</div>';

    var el = document.getElementById('calendar-container');
    if (el) el.innerHTML = html;

    // 存储当前日历月份
    StatsModule._calYear = year;
    StatsModule._calMonth = month;
  }

  StatsModule._calYear = new Date().getFullYear();
  StatsModule._calMonth = new Date().getMonth() + 1;

  StatsModule.prevMonth = function() {
    StatsModule._calMonth--;
    if (StatsModule._calMonth < 1) { StatsModule._calMonth = 12; StatsModule._calYear--; }
    renderCalendar(StatsModule._calYear, StatsModule._calMonth);
  };

  StatsModule.nextMonth = function() {
    StatsModule._calMonth++;
    if (StatsModule._calMonth > 12) { StatsModule._calMonth = 1; StatsModule._calYear++; }
    renderCalendar(StatsModule._calYear, StatsModule._calMonth);
  };

  window.StatsModule = StatsModule;
})();
