/* app.js - 应用入口 */
(function() {
  var App = {
    init: function() {
      // 检测发音支持
      if (!window.speechSynthesis) {
        console.warn('当前浏览器不支持语音合成');
      }

      // 初始化数据（首次使用）
      var data = Storage.load();
      if (!data.user.createdAt) {
        data.user.createdAt = new Date().toISOString();
        Storage.save(data);
      }

      // 注册路由
      Router.register('home', { module: HomeModule, title: '首页' });
      Router.register('learn', { module: LearnModule, title: '学习' });
      Router.register('quiz', { module: QuizModule, title: '测验' });
      Router.register('spell', { module: SpellModule, title: '拼写' });
      Router.register('review', { module: ReviewModule, title: '错词本' });
      Router.register('stats', { module: StatsModule, title: '统计' });
      Router.register('settings', { module: SettingsModule, title: '设置' });

      // 启动路由
      Router.init();

      // 注册 Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function(err) {
          console.warn('Service Worker 注册失败', err);
        });
      }
    }
  };

  /* 首页模块 */
  var HomeModule = {
    init: function() {
      this.render();
    },
    destroy: function() {},

    render: function() {
      var user = Storage.getUser();
      var grade = user.grade || '3a';
      var logs = Storage.getLearningLogs();
      var today = new Date().toISOString().split('T')[0];
      var todayLog = logs[today] || { newWords: 0, reviewed: 0, correctRate: 0 };

      var progress = Storage.load().wordProgress;
      var masteredCount = 0;
      for (var wid in progress) { if (progress[wid].mastered) masteredCount++; }
      var streak = calculateStreak(logs);

      var gradeLabel = VocabDB.getGradeLabel(grade);
      var wordCount = VocabDB.getWordCount(grade);

      var container = document.getElementById('page-home');
      container.innerHTML =
        '<div class="home-header">' +
          '<div class="greeting">你好，' + (user.name || '小朋友') + '！ 👋</div>' +
          '<div class="grade-info">' + gradeLabel + ' · 共 ' + wordCount + ' 个单词</div>' +
        '</div>' +

        /* 今日统计 */
        '<div class="stat-row">' +
          '<div class="stat-card"><div class="stat-value">' + ((todayLog.newWords || 0) + (todayLog.reviewed || 0)) + '</div><div class="stat-label">今日学习</div></div>' +
          '<div class="stat-card"><div class="stat-value">' + masteredCount + '</div><div class="stat-label">已掌握</div></div>' +
          '<div class="stat-card"><div class="stat-value">' + streak + '</div><div class="stat-label">连续打卡</div></div>' +
        '</div>' +

        /* 主按钮 */
        '<button class="btn btn-primary btn-lg btn-block animate-fadeIn" style="margin-bottom:24px;font-size:22px;" onclick="Router.navigate(\'learn\')">📖 开始学习</button>' +

        /* 快捷入口 */
        '<div class="quick-actions">' +
          '<div class="quick-action-btn" onclick="Router.navigate(\'quiz\')">' +
            '<span class="action-icon">🎯</span><span class="action-label">选择题</span>' +
          '</div>' +
          '<div class="quick-action-btn" onclick="Router.navigate(\'spell\')">' +
            '<span class="action-icon">✍️</span><span class="action-label">拼写</span>' +
          '</div>' +
          '<div class="quick-action-btn" onclick="Router.navigate(\'review\')">' +
            '<span class="action-icon">📋</span><span class="action-label">错词本</span>' +
          '</div>' +
        '</div>' +

        /* 打卡日历精简 */
        '<div class="section-title">📅 本月打卡</div>' +
        '<div class="calendar-container" id="home-calendar"></div>';
      
      // 渲染精简日历
      renderHomeCalendar();
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
      } else break;
    }
    return streak;
  }

  function renderHomeCalendar() {
    var logs = Storage.getLearningLogs();
    var now = new Date();
    var year = now.getFullYear(), month = now.getMonth() + 1;
    var firstDay = new Date(year, month - 1, 1).getDay();
    var daysInMonth = new Date(year, month, 0).getDate();
    var today = now.getDate();

    var html = '<div class="calendar-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div><div class="calendar-days">';
    for (var i = 0; i < firstDay; i++) html += '<span class="day empty"></span>';
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var hasStudy = logs[dateStr] && ((logs[dateStr].newWords || 0) + (logs[dateStr].reviewed || 0)) > 0;
      var cls = 'day';
      if (day === today) cls += ' today';
      if (hasStudy) cls += ' studied';
      html += '<span class="' + cls + '">' + day + '</span>';
    }
    html += '</div>';
    var el = document.getElementById('home-calendar');
    if (el) el.innerHTML = html;
  }

  /* 设置页模块 */
  var SettingsModule = {
    init: function() { this.render(); },
    destroy: function() {},
    render: function() {
      var user = Storage.getUser();
      var settings = Storage.getSettings();
      var grades = VocabDB.getGrades();
      var gradeOptions = '';
      for (var g in grades) {
        gradeOptions += '<option value="' + g + '"' + (user.grade === g ? ' selected' : '') + '>' + grades[g] + '</option>';
      }
      var container = document.getElementById('page-settings');
      container.innerHTML =
        '<div style="padding:16px 0;">' +
          '<div class="flex-between" style="margin-bottom:24px;">' +
            '<h2 style="font-size:20px;font-weight:600;">设置</h2>' +
            '<button class="btn btn-ghost btn-sm" onclick="Router.navigate(\'home\')">← 返回</button>' +
          '</div>' +

          '<div class="settings-group">' +
            '<div class="section-title">学习设置</div>' +
            '<div class="settings-item">' +
              '<span class="setting-label">昵称</span>' +
              '<input type="text" value="' + (user.name || '小朋友') + '" id="setting-name" style="text-align:right;padding:8px;border:1px solid var(--color-border);border-radius:8px;width:120px;" onchange="SettingsModule.saveName(this.value)">' +
            '</div>' +
            '<div class="settings-item">' +
              '<span class="setting-label">年级</span>' +
              '<select id="setting-grade" onchange="SettingsModule.saveGrade(this.value)">' + gradeOptions + '</select>' +
            '</div>' +
            '<div class="settings-item">' +
              '<span class="setting-label">每日目标</span>' +
              '<select id="setting-goal" onchange="SettingsModule.saveGoal(this.value)">' +
                '<option value="5"' + (user.dailyGoal == 5 ? ' selected' : '') + '>5个</option>' +
                '<option value="10"' + (user.dailyGoal == 10 ? ' selected' : '') + '>10个</option>' +
                '<option value="15"' + (user.dailyGoal == 15 ? ' selected' : '') + '>15个</option>' +
                '<option value="20"' + (user.dailyGoal == 20 ? ' selected' : '') + '>20个</option>' +
              '</select>' +
            '</div>' +
          '</div>' +

          '<div class="settings-group">' +
            '<div class="section-title">发音设置</div>' +
            '<div class="settings-item">' +
              '<span class="setting-label">语速</span>' +
              '<select onchange="Speech.setSpeed(parseFloat(this.value))">' +
                '<option value="0.6"' + (settings.voiceSpeed == 0.6 ? ' selected' : '') + '>慢速</option>' +
                '<option value="0.8"' + (settings.voiceSpeed == 0.8 ? ' selected' : '') + '>正常</option>' +
                '<option value="1.0"' + (settings.voiceSpeed == 1.0 ? ' selected' : '') + '>快速</option>' +
              '</select>' +
            '</div>' +
          '</div>' +

          '<div class="settings-group">' +
            '<div class="section-title">数据管理</div>' +
            '<div class="settings-item" onclick="SettingsModule.confirmClear()" style="cursor:pointer;">' +
              '<span class="setting-label" style="color:var(--color-danger);">清除所有数据</span>' +
              '<span style="color:var(--color-danger);">→</span>' +
            '</div>' +
          '</div>' +

          '<div style="text-align:center;margin-top:32px;color:var(--color-text-light);font-size:12px;">' +
            '单词小工具 v1.0 · 湘教版词库' +
          '</div>' +
        '</div>';
    },
    saveName: function(name) {
      Storage.setUser({ name: name });
    },
    saveGrade: function(grade) {
      Storage.setGrade(grade);
    },
    saveGoal: function(goal) {
      Storage.setUser({ dailyGoal: parseInt(goal) });
    },
    confirmClear: function() {
      if (confirm('⚠️ 确定要清除所有学习数据吗？\n此操作不可恢复！')) {
        if (confirm('再次确认：所有学习记录和进度将被删除！')) {
          Storage.clearAll();
          location.reload();
        }
      }
    }
  };

  window.HomeModule = HomeModule;
  window.SettingsModule = SettingsModule;
  window.App = App;

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { App.init(); });
  } else {
    App.init();
  }
})();
