/* router.js - Hash 路由管理器 */
(function() {
  var routes = {};
  var currentModule = null;
  var currentPage = null;

  var Router = {
    register: function(path, config) {
      routes[path] = config;
    },

    resolve: function() {
      var hash = location.hash.replace('#', '') || 'home';
      var route = routes[hash];

      if (!route) {
        hash = 'home';
        route = routes['home'];
      }

      // 卸载当前模块
      if (currentModule && currentModule.destroy) {
        currentModule.destroy();
      }

      // 切换页面
      var pages = document.querySelectorAll('.page');
      for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove('active');
      }

      var targetPage = document.getElementById('page-' + hash);
      if (targetPage) {
        targetPage.classList.add('active');
      }

      // 高亮 Tab
      var tabs = document.querySelectorAll('.tab-item');
      for (var j = 0; j < tabs.length; j++) {
        tabs[j].classList.remove('active');
        if (tabs[j].getAttribute('data-route') === hash) {
          tabs[j].classList.add('active');
        }
      }

      // 装载模块
      if (route && route.module) {
        currentModule = route.module;
        if (currentModule.init) {
          currentModule.init(route.params || {});
        }
      }

      currentPage = hash;
      document.title = (route && route.title ? route.title : '单词小工具') + ' - 单词小工具';
    },

    navigate: function(path) {
      location.hash = '#' + path;
    },

    goBack: function() {
      history.back();
    },

    getCurrentPage: function() {
      return currentPage;
    },

    init: function() {
      var self = this;
      window.addEventListener('hashchange', function() { self.resolve(); });
      self.resolve();
    }
  };

  window.Router = Router;
})();
