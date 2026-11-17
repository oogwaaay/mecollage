/**
 * Editor persistence: autosave the project to IndexedDB, restore on reload,
 * and keep deleted images in a 30-day local trash. No upload.
 * Disabled under automation unless window.__mcEnablePersistence === true,
 * so browser tests keep a clean Editor state.
 */
(function () {
  'use strict';
  if (window.mcEditorPersistence) return;
  window.mcEditorPersistence = true;
  if (navigator.webdriver && window.__mcEnablePersistence !== true) return;
  if (location.hash === '#christmas') return;

  var DB_NAME = 'mecollage-editor';
  var DB_VERSION = 1;
  var DAY = 86400000;
  var app = null;
  var saveTimer = null;
  var labels = {
    en: { saved: 'Project saved in this browser.', restored: 'Your last project was restored.', trashed: 'Moved to trash. Kept for 30 days.', restore: 'Restore', trashLeft: '{n} deleted photo(s) can be restored for 30 days.', restoreAll: 'Restore all', fresh: 'Start fresh' },
    zh: { saved: '项目已保存在这个浏览器里。', restored: '已恢复上次的项目。', trashed: '已移入回收站，保留 30 天。', restore: '恢复', trashLeft: '回收站里有 {n} 张图片，30 天内可以恢复。', restoreAll: '全部恢复', fresh: '重新开始' },
    tw: { saved: '專案已保存在這個瀏覽器裡。', restored: '已恢復上次的專案。', trashed: '已移入回收站，保留 30 天。', restore: '恢復', trashLeft: '回收站裡有 {n} 張圖片，30 天內可以恢復。', restoreAll: '全部恢復', fresh: '重新開始' },
    ja: { saved: 'このブラウザに保存しました。', restored: '前回のプロジェクトを復元しました。', trashed: 'ゴミ箱に移動しました（30日間保存）。', restore: '復元', trashLeft: '削除した画像が {n} 枚あります。30日以内なら復元できます。', restoreAll: 'すべて復元', fresh: '新しく始める' },
    es: { saved: 'Proyecto guardado en este navegador.', restored: 'Se ha restaurado tu último proyecto.', trashed: 'Movido a la papelera. Se conserva 30 días.', restore: 'Restaurar', trashLeft: '{n} foto(s) eliminadas se pueden restaurar durante 30 días.', restoreAll: 'Restaurar todo', fresh: 'Empezar de nuevo' }
  };
  function langKey() {
    var l = (document.documentElement.lang || 'en').toLowerCase();
    if (l.indexOf('zh-tw') === 0 || l.indexOf('zh-hant') === 0) return 'tw';
    if (l.indexOf('zh') === 0) return 'zh';
    if (l.indexOf('ja') === 0) return 'ja';
    if (l.indexOf('es') === 0) return 'es';
    return 'en';
  }
  var L = labels[langKey()];
  function toast(message, options) {
    if (window.mcUI && typeof window.mcUI.toast === 'function') return window.mcUI.toast(message, options || {});
    if (typeof window.mcToast === 'function') return window.mcToast(message, options || {});
  }
  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
        if (!db.objectStoreNames.contains('trash')) db.createObjectStore('trash', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function request(storeName, mode, run) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, mode);
        var store = tx.objectStore(storeName);
        var req = run(store);
        tx.oncomplete = function () { resolve(req ? req.result : undefined); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }
  function snapshotState() {
    if (!app || !app.images.length) return null;
    var snap = app.snapshot ? app.snapshot() : null;
    if (!snap) return null;
    return {
      images: snap.images.map(function (img) { return { url: img.url, width: img.width, height: img.height, filter: img.filter || 'none' }; }),
      textLayers: snap.textLayers || [],
      stickerLayers: snap.stickerLayers || [],
      ratio: snap.currentAspectRatio,
      gutter: snap.gutter,
      radius: snap.radius,
      savedAt: Date.now()
    };
  }
  function saveNow() {
    var data = snapshotState();
    if (!data) {
      request('state', 'readwrite', function (s) { return s.delete('current'); }).catch(function () {});
      return;
    }
    request('state', 'readwrite', function (s) { return s.put(data, 'current'); }).catch(function () {});
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 900);
  }
  function applyState(data) {
    if (!data || !Array.isArray(data.images) || !data.images.length) return false;
    if (app.images.length) return false;
    app.images = data.images.map(function (img) {
      return { file: null, url: img.url, width: img.width, height: img.height, filter: img.filter || 'none' };
    });
    app.textLayers = data.textLayers || [];
    app.stickerLayers = data.stickerLayers || [];
    app.currentAspectRatio = data.ratio || app.currentAspectRatio;
    app.gutter = typeof data.gutter === 'number' ? data.gutter : app.gutter;
    app.radius = typeof data.radius === 'number' ? data.radius : app.radius;
    if (typeof app.renderCollage === 'function') app.renderCollage();
    if (typeof app.showCollageCanvas === 'function') app.showCollageCanvas();
    if (typeof app.updateImageCount === 'function') app.updateImageCount();
    var gs = document.getElementById('gutterSlider');
    var gv = document.getElementById('gutterValue');
    var rs = document.getElementById('radiusSlider');
    var rv = document.getElementById('radiusValue');
    if (gs) gs.value = app.gutter;
    if (gv) gv.textContent = app.gutter + 'px';
    if (rs) rs.value = app.radius;
    if (rv) rv.textContent = app.radius + 'px';
    return true;
  }
  function restoreProject() {
    return request('state', 'readonly', function (s) { return s.get('current'); }).then(function (data) {
      if (applyState(data)) {
        toast(L.restored, { type: 'success', duration: 4200 });
        scheduleSave();
      }
    }).catch(function () {});
  }
  function addTrash(img) {
    if (!img || !img.url) return Promise.resolve();
    return request('trash', 'readwrite', function (s) {
      return s.add({ url: img.url, width: img.width, height: img.height, filter: img.filter || 'none', deletedAt: Date.now() });
    });
  }
  function purgeTrash() {
    return request('trash', 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      var old = (all || []).filter(function (row) { return Date.now() - row.deletedAt > 30 * DAY; });
      return Promise.all(old.map(function (row) {
        return request('trash', 'readwrite', function (s) { return s.delete(row.id); });
      })).then(function () { return (all || []).length - old.length; });
    }).catch(function () { return 0; });
  }
  function restoreAllTrash() {
    return request('trash', 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      if (!all || !all.length) return 0;
      var room = Math.max(0, (app.maxImages || 20) - app.images.length);
      all.slice(0, room).forEach(function (row) {
        app.images.push({ file: null, url: row.url, width: row.width, height: row.height, filter: row.filter || 'none' });
      });
      if (typeof app.renderCollage === 'function') app.renderCollage();
      if (typeof app.showCollageCanvas === 'function') app.showCollageCanvas();
      if (typeof app.updateImageCount === 'function') app.updateImageCount();
      return request('trash', 'readwrite', function (s) { return s.clear(); }).then(function () {
        scheduleSave();
        return all.length;
      });
    }).catch(function () { return 0; });
  }
  function showTrashHint() {
    return purgeTrash().then(function (count) {
      if (!count) return;
      toast(L.trashLeft.replace('{n}', String(count)), {
        type: 'info', duration: 7000, actionLabel: L.restoreAll, onAction: function () { restoreAllTrash(); }
      });
    });
  }
  function boot() {
    app = window.mecollage;
    if (!app || !Array.isArray(app.images)) return false;
    var originalDirty = app.markDirty ? app.markDirty.bind(app) : function () {};
    app.markDirty = function () { originalDirty(); scheduleSave(); };
    var originalRemove = app.removeImage ? app.removeImage.bind(app) : null;
    if (originalRemove) {
      app.removeImage = function (index) {
        var img = app.images[index];
        var result = originalRemove(index);
        if (img) {
          addTrash(img).then(function () {
            toast(L.trashed, { type: 'info', duration: 4000 });
            scheduleSave();
          });
        }
        return result;
      };
    }
    restoreProject();
    showTrashHint();
    window.addEventListener('pagehide', function () { if (saveTimer) { clearTimeout(saveTimer); saveNow(); } });
    return true;
  }
  if (!boot()) {
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (boot() || tries > 40) clearInterval(timer);
    }, 250);
  }
})();
