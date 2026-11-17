/**
 * Freeform collage board: drag/resize photos anywhere, split into tiles, export.
 * Client-side only. No upload.
 */
(function () {
  'use strict';
  var root = document.getElementById('ffTool');
  if (!root) return;
  var T = window.MC_FF_I18N || {};
  var input = document.getElementById('ffFile');
  var pick = document.getElementById('ffPick');
  var drop = document.getElementById('ffDrop');
  var workspace = document.getElementById('ffWorkspace');
  var board = document.getElementById('ffBoard');
  var presets = document.getElementById('ffPresets');
  var widthInput = document.getElementById('ffW');
  var heightInput = document.getElementById('ffH');
  var bgInput = document.getElementById('ffBg');
  var formatSelect = document.getElementById('ffFormat');
  var qualityInput = document.getElementById('ffQuality');
  var split2 = document.getElementById('ffSplit2');
  var split3 = document.getElementById('ffSplit3');
  var exportBtn = document.getElementById('ffExport');
  var copyBtn = document.getElementById('ffCopy');
  var statusEl = document.getElementById('ffStatus');
  var boardW = 1080;
  var boardH = 1080;
  var items = [];
  var maxZ = 1;
  var selected = null;
  var uid = 0;

  function say(text) { if (statusEl) statusEl.textContent = text; }
  function labels(key, n) { return (T[key] || key).replace('{n}', String(n)); }
  function setBoard(w, h) {
    boardW = Math.max(200, w);
    boardH = Math.max(200, h);
    board.style.aspectRatio = boardW + ' / ' + boardH;
    if (widthInput) widthInput.value = String(boardW);
    if (heightInput) heightInput.value = String(boardH);
    say(labels('size', 0).replace('{w}', String(boardW)).replace('{h}', String(boardH)));
  }
  function itemEl(item) {
    var el = document.createElement('div');
    el.className = 'ff-item';
    el.style.left = (item.x * 100) + '%';
    el.style.top = (item.y * 100) + '%';
    el.style.width = (item.w * 100) + '%';
    el.style.height = (item.h * 100) + '%';
    el.style.zIndex = String(item.z);
    var img = document.createElement('img');
    img.src = item.url;
    img.alt = '';
    img.draggable = false;
    var handle = document.createElement('span');
    handle.className = 'ff-handle';
    handle.setAttribute('aria-hidden', 'true');
    el.appendChild(img);
    el.appendChild(handle);
    el.addEventListener('pointerdown', function (e) { startDrag(e, item, el); });
    handle.addEventListener('pointerdown', function (e) { e.stopPropagation(); startResize(e, item, el); });
    item.el = el;
    return el;
  }
  function addItem(url, img, placement) {
    var w = placement && placement.w ? placement.w : 0.46;
    var h = placement && placement.h ? placement.h : (w * (boardW / boardH) * (img.naturalHeight / img.naturalWidth));
    var item = {
      id: ++uid, url: url, img: img, z: ++maxZ,
      x: placement && typeof placement.x === 'number' ? placement.x : 0.08 + ((items.length % 3) * 0.14),
      y: placement && typeof placement.y === 'number' ? placement.y : 0.08 + ((items.length % 3) * 0.12),
      w: w, h: h
    };
    items.push(item);
    board.appendChild(itemEl(item));
    select(item);
  }
  function select(item) {
    selected = item;
    items.forEach(function (it) { if (it.el) it.el.classList.toggle('is-selected', it === item); });
  }
  function startDrag(e, item, el) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    select(item);
    item.z = ++maxZ;
    el.style.zIndex = String(item.z);
    var rect = board.getBoundingClientRect();
    var startX = e.clientX, startY = e.clientY, ox = item.x, oy = item.y;
    function move(ev) {
      item.x = Math.min(1 - item.w, Math.max(0, ox + (ev.clientX - startX) / rect.width));
      item.y = Math.min(1 - item.h, Math.max(0, oy + (ev.clientY - startY) / rect.height));
      el.style.left = (item.x * 100) + '%';
      el.style.top = (item.y * 100) + '%';
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function startResize(e, item, el) {
    e.preventDefault();
    var rect = board.getBoundingClientRect();
    var startX = e.clientX;
    var ratio = item.img.naturalHeight / item.img.naturalWidth;
    var startW = item.w;
    function move(ev) {
      var w = Math.min(1 - item.x, Math.max(0.06, startW + (ev.clientX - startX) / rect.width));
      item.w = w;
      item.h = Math.min(1 - item.y, w * (boardW / boardH) * ratio);
      el.style.width = (item.w * 100) + '%';
      el.style.height = (item.h * 100) + '%';
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () { addItem(reader.result, img); };
      img.src = reader.result;
      drop.hidden = true;
      workspace.hidden = false;
    };
    reader.readAsDataURL(file);
  }
  function splitSelected(n) {
    if (!selected) { say(T.selectFirst || 'Select a photo first.'); return; }
    var item = selected;
    var tileW = item.img.naturalWidth / n;
    var tileH = item.img.naturalHeight / n;
    var tiles = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(tileW));
        canvas.height = Math.max(1, Math.round(tileH));
        canvas.getContext('2d').drawImage(item.img, c * tileW, r * tileH, tileW, tileH, 0, 0, canvas.width, canvas.height);
        tiles.push({ url: canvas.toDataURL('image/png'), col: c, row: r });
      }
    }
    var baseX = item.x, baseY = item.y, baseW = item.w / n, baseH = item.h / n;
    items = items.filter(function (it) { return it !== item; });
    if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
    selected = null;
    tiles.forEach(function (tile) {
      var img = new Image();
      img.onload = function () {
        addItem(tile.url, img, { x: baseX + tile.col * baseW, y: baseY + tile.row * baseH, w: baseW, h: baseH });
      };
      img.src = tile.url;
    });
    say(labels('splitDone', n * n));
  }
  function renderCanvas(scale) {
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(boardW * scale);
    canvas.height = Math.round(boardH * scale);
    var ctx = canvas.getContext('2d');
    var bg = bgInput ? bgInput.value : '#ffffff';
    if (bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    items.slice().sort(function (a, b) { return a.z - b.z; }).forEach(function (item) {
      ctx.drawImage(item.img, item.x * canvas.width, item.y * canvas.height, item.w * canvas.width, item.h * canvas.height);
    });
    return canvas;
  }
  function exportImage() {
    if (!items.length) { say(T.addFirst || 'Add at least one photo.'); return; }
    var format = formatSelect ? formatSelect.value : 'image/png';
    var quality = qualityInput ? Number(qualityInput.value) / 100 : 0.92;
    var canvas = renderCanvas(2);
    var ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
    canvas.toBlob(function (blob) {
      if (!blob) { say(T.error || 'Export failed.'); return; }
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'freeform-collage.' + ext;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1500);
      say(T.done || 'Exported.');
    }, format, quality);
  }
  function copyImage() {
    if (!items.length) { say(T.addFirst || 'Add at least one photo.'); return; }
    if (!navigator.clipboard || !window.ClipboardItem) { say(T.noClipboard || 'Clipboard is not available.'); return; }
    renderCanvas(2).toBlob(function (blob) {
      if (!blob) return;
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () {
        say(T.copied || 'Copied.');
      }, function () { say(T.noClipboard || 'Clipboard is not available.'); });
    }, 'image/png');
  }
  if (pick && input) pick.addEventListener('click', function () { input.click(); });
  if (input) input.addEventListener('change', function (e) { Array.prototype.forEach.call(e.target.files || [], loadFile); });
  if (drop) {
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { Array.prototype.forEach.call((e.dataTransfer && e.dataTransfer.files) || [], loadFile); });
    drop.addEventListener('click', function (e) { if (e.target === drop) input.click(); });
  }
  if (presets) presets.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-w]');
    if (!btn) return;
    setBoard(Number(btn.getAttribute('data-w')), Number(btn.getAttribute('data-h')));
    presets.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
  });
  [widthInput, heightInput].forEach(function (el) {
    if (el) el.addEventListener('change', function () { setBoard(Number(widthInput.value) || boardW, Number(heightInput.value) || boardH); });
  });
  if (split2) split2.addEventListener('click', function () { splitSelected(2); });
  if (split3) split3.addEventListener('click', function () { splitSelected(3); });
  if (exportBtn) exportBtn.addEventListener('click', exportImage);
  if (copyBtn) copyBtn.addEventListener('click', copyImage);
  setBoard(boardW, boardH);
})();
