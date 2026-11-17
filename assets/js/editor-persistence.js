/**
 * Editor persistence: autosave the project to IndexedDB, restore on reload,
 * and a browsable 30-day local trash panel (restore one / all, empty).
 * No upload. Disabled under automation unless window.__mcEnablePersistence === true.
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
  var trashRows = [];
  var ui = null;
  var panelOpen = false;
  var emptyArmed = false;
  var emptyTimer = null;
  var labels = {
    en: { saved: 'Project saved in this browser.', restored: 'Your last project was restored.', trashed: 'Moved to trash. Kept for 30 days.', undo: 'Undo', trash: 'Trash', count: '{n} pictures', note: 'Deleted pictures wait here for 30 days, only in this browser.', days: '{n} days left', restore: 'Restore', restoreAll: 'Restore all', empty: 'Empty trash', emptyConfirm: 'Confirm empty', emptied: 'Trash emptied.', close: 'Close' },
    zh: { saved: '项目已保存在这个浏览器里。', restored: '已恢复上次的项目。', trashed: '已移入回收站，保留 30 天。', undo: '撤销', trash: '回收站', count: '{n} 张图片', note: '删除的图片会在这里保留 30 天，只存在这个浏览器里。', days: '剩余 {n} 天', restore: '恢复', restoreAll: '全部恢复', empty: '清空回收站', emptyConfirm: '确认清空', emptied: '回收站已清空。', close: '关闭' },
    tw: { saved: '專案已保存在這個瀏覽器裡。', restored: '已恢復上次的專案。', trashed: '已移入回收桶，保留 30 天。', undo: '復原', trash: '回收桶', count: '{n} 張圖片', note: '刪除的圖片會在這裡保留 30 天，只存在這個瀏覽器裡。', days: '剩 {n} 天', restore: '復原', restoreAll: '全部復原', empty: '清空回收桶', emptyConfirm: '確認清空', emptied: '回收桶已清空。', close: '關閉' },
    ja: { saved: 'このブラウザに保存しました。', restored: '前回のプロジェクトを復元しました。', trashed: 'ゴミ箱に移動しました（30日間保存）。', undo: '元に戻す', trash: 'ゴミ箱', count: '{n} 枚', note: '削除した画像はこのブラウザに 30 日間保存されます。', days: '残り {n} 日', restore: '復元', restoreAll: 'すべて復元', empty: 'ゴミ箱を空にする', emptyConfirm: '空にする', emptied: 'ゴミ箱を空にしました。', close: '閉じる' },
    es: { saved: 'Proyecto guardado en este navegador.', restored: 'Se ha restaurado tu último proyecto.', trashed: 'Movido a la papelera. Se conserva 30 días.', undo: 'Deshacer', trash: 'Papelera', count: '{n} fotos', note: 'Las fotos eliminadas se guardan aquí 30 días, solo en este navegador.', days: 'Quedan {n} días', restore: 'Restaurar', restoreAll: 'Restaurar todo', empty: 'Vaciar papelera', emptyConfirm: 'Confirmar', emptied: 'Papelera vacía.', close: 'Cerrar' }
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
  function daysLeft(row) {
    return Math.max(0, 30 - Math.floor((Date.now() - row.deletedAt) / DAY));
  }
  function togglePanel(open) {
    if (!ui) return;
    panelOpen = Boolean(open);
    ui.panel.hidden = !panelOpen;
    ui.btn.setAttribute('aria-expanded', String(panelOpen));
    if (panelOpen) refreshTrash();
  }
  function renderList() {
    if (!ui) return;
    ui.list.innerHTML = '';
    trashRows.forEach(function (row) {
      var li = document.createElement('li');
      li.className = 'mc-trash-item';
      var img = document.createElement('img');
      img.src = row.url || '';
      img.alt = '';
      img.width = 64;
      img.height = 48;
      img.loading = 'lazy';
      var meta = document.createElement('div');
      meta.className = 'mc-trash-meta';
      var name = document.createElement('span');
      name.className = 'mc-trash-name';
      name.textContent = row.name || '';
      var days = document.createElement('span');
      days.className = 'mc-trash-days';
      days.textContent = L.days.replace('{n}', String(daysLeft(row)));
      meta.appendChild(name);
      meta.appendChild(days);
      var restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'mc-trash-restore';
      restore.textContent = L.restore;
      restore.addEventListener('click', function () { restoreOne(row.id); });
      li.appendChild(img);
      li.appendChild(meta);
      li.appendChild(restore);
      ui.list.appendChild(li);
    });
  }
  function refreshTrash() {
    return request('trash', 'readonly', function (s) { return s.getAll(); }).then(function (rows) {
      trashRows = (rows || []).slice().sort(function (a, b) { return b.deletedAt - a.deletedAt; });
      ensureUI();
      if (!trashRows.length) {
        ui.btn.hidden = true;
        ui.count.hidden = true;
        togglePanel(false);
        renderList();
        return;
      }
      ui.btn.hidden = false;
      ui.count.hidden = false;
      ui.count.textContent = String(trashRows.length);
      ui.total.textContent = L.count.replace('{n}', String(trashRows.length));
      renderList();
    }).catch(function () {});
  }
  function addTrash(img) {
    if (!img || !img.url) return Promise.resolve(null);
    var name = img.file && img.file.name ? img.file.name : '';
    return request('trash', 'readwrite', function (s) {
      return s.add({ url: img.url, name: name, width: img.width, height: img.height, filter: img.filter || 'none', deletedAt: Date.now() });
    }).then(function (id) {
      refreshTrash();
      return id;
    });
  }
  function pushBack(row) {
    if (!row || !row.url) return false;
    if (app.images.length >= (app.maxImages || 20)) return false;
    app.images.push({ file: null, url: row.url, width: row.width, height: row.height, filter: row.filter || 'none' });
    if (typeof app.renderCollage === 'function') app.renderCollage();
    if (typeof app.showCollageCanvas === 'function') app.showCollageCanvas();
    if (typeof app.updateImageCount === 'function') app.updateImageCount();
    if (typeof app.markDirty === 'function') app.markDirty();
    return true;
  }
  function restoreOne(id) {
    return request('trash', 'readonly', function (s) { return s.get(id); }).then(function (row) {
      if (!row) return;
      return request('trash', 'readwrite', function (s) { return s.delete(id); }).then(function () {
        pushBack(row);
        refreshTrash();
      });
    }).catch(function () {});
  }
  function restoreAllTrash() {
    return request('trash', 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      if (!all || !all.length) return;
      all.forEach(pushBack);
      return request('trash', 'readwrite', function (s) { return s.clear(); }).then(function () {
        refreshTrash();
        scheduleSave();
      });
    }).catch(function () {});
  }
  function emptyTrash() {
    if (!ui) return;
    var btn = ui.panel.querySelector('.mc-trash-empty');
    if (!emptyArmed) {
      emptyArmed = true;
      btn.textContent = L.emptyConfirm;
      clearTimeout(emptyTimer);
      emptyTimer = setTimeout(function () { emptyArmed = false; btn.textContent = L.empty; }, 3000);
      return;
    }
    emptyArmed = false;
    clearTimeout(emptyTimer);
    btn.textContent = L.empty;
    request('trash', 'readwrite', function (s) { return s.clear(); }).then(function () {
      refreshTrash();
      toast(L.emptied, { type: 'success' });
    }).catch(function () {});
  }
  function ensureUI() {
    if (ui) return ui;
    var btn = document.createElement('button');
    btn.id = 'mcTrashBtn';
    btn.className = 'mc-trash-fab';
    btn.type = 'button';
    btn.hidden = true;
    btn.setAttribute('aria-label', L.trash);
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i><span class="mc-trash-count" hidden>0</span>';
    var panel = document.createElement('div');
    panel.id = 'mcTrashPanel';
    panel.className = 'mc-trash-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', L.trash);
    panel.innerHTML = '<div class="mc-trash-head"><strong>' + L.trash + '</strong><span class="mc-trash-total"></span><button type="button" class="mc-trash-close" aria-label="' + L.close + '">×</button></div>' +
      '<p class="mc-trash-note">' + L.note + '</p>' +
      '<ul class="mc-trash-list"></ul>' +
      '<div class="mc-trash-actions"><button type="button" class="mc-trash-restore-all">' + L.restoreAll + '</button><button type="button" class="mc-trash-empty">' + L.empty + '</button></div>';
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    btn.addEventListener('click', function () { togglePanel(!panelOpen); });
    panel.querySelector('.mc-trash-close').addEventListener('click', function () { togglePanel(false); });
    panel.querySelector('.mc-trash-restore-all').addEventListener('click', restoreAllTrash);
    panel.querySelector('.mc-trash-empty').addEventListener('click', emptyTrash);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panelOpen) togglePanel(false); });
    document.addEventListener('pointerdown', function (e) {
      if (!panelOpen) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      togglePanel(false);
    });
    ui = { btn: btn, panel: panel, count: btn.querySelector('.mc-trash-count'), total: panel.querySelector('.mc-trash-total'), list: panel.querySelector('.mc-trash-list') };
    return ui;
  }
  function purgeTrash() {
    return request('trash', 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      var old = (all || []).filter(function (row) { return Date.now() - row.deletedAt > 30 * DAY; });
      return Promise.all(old.map(function (row) {
        return request('trash', 'readwrite', function (s) { return s.delete(row.id); });
      })).then(function () { return (all || []).length - old.length; });
    }).catch(function () { return 0; });
  }
  function boot() {
    app = window.mecollage;
    if (!app || !Array.isArray(app.images)) return false;
    ensureUI();
    var originalDirty = app.markDirty ? app.markDirty.bind(app) : function () {};
    app.markDirty = function () { originalDirty(); scheduleSave(); };
    var originalRemove = app.removeImage ? app.removeImage.bind(app) : null;
    if (originalRemove) {
      app.removeImage = function (index) {
        var img = app.images[index];
        var result = originalRemove(index);
        if (img) {
          addTrash(img).then(function (id) {
            toast(L.trashed, {
              type: 'info', duration: 5200, actionLabel: L.undo,
              onAction: function () { if (id != null) restoreOne(id); }
            });
            scheduleSave();
          });
        }
        return result;
      };
    }
    restoreProject();
    purgeTrash().then(refreshTrash);
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
