/**
 * Combine Images landing pages: "Start combining" opens a file picker, hands the
 * photos to the editor through the existing IndexedDB handoff (?handoff=1).
 * The anchors keep their ?combine=1 href as the no-JS / failure fallback.
 */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-combine-start]'));
  if (!links.length || typeof indexedDB === 'undefined') return;

  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.hidden = true;
  input.id = 'combineFiles';
  document.body.appendChild(input);

  var pendingHref = links[0].href;
  var maxImages = 20;

  links.forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      pendingHref = link.href;
      input.value = '';
      input.click();
    });
  });

  function readFile(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve({ blob: file, w: img.naturalWidth, h: img.naturalHeight, name: file.name });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('mecollage-editor', 2);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('handoff')) db.createObjectStore('handoff');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function store(items) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('handoff', 'readwrite');
        tx.objectStore('handoff').put({ items: items, at: Date.now() }, 'queue');
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
        tx.onabort = function () { db.close(); reject(tx.error); };
      });
    });
  }

  function targetUrl() {
    var base = (pendingHref || location.href).split('?')[0].split('#')[0];
    return base + '?handoff=1';
  }

  input.addEventListener('change', function () {
    var files = Array.prototype.slice.call(input.files || []).slice(0, maxImages);
    if (!files.length) return;
    Promise.all(files.map(readFile))
      .then(function (items) {
        var payload = items.filter(function (item) { return item && item.blob && item.w && item.h; });
        if (!payload.length) throw new Error('no image');
        return store(payload);
      })
      .then(function () { location.href = targetUrl(); })
      .catch(function () { location.href = pendingHref || targetUrl(); });
  });
})();
