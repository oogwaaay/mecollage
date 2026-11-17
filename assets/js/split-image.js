/**
 * Split Image tool: client-side tile splitter + store-only ZIP.
 * No upload, no dependencies. Canvas crops the source image, ZIP is built in memory.
 */
(function () {
  'use strict';
  var root = document.getElementById('splitTool');
  if (!root) return;
  var T = window.MC_SPLIT_I18N || {};
  var input = document.getElementById('splitFile');
  var pick = document.getElementById('splitPick');
  var drop = document.getElementById('splitDrop');
  var workspace = document.getElementById('splitWorkspace');
  var canvas = document.getElementById('splitPreview');
  var grid = document.getElementById('splitGrid');
  var statusEl = document.getElementById('splitStatus');
  var downloadBtn = document.getElementById('splitDownload');
  var modesWrap = root.querySelector('.split-modes');
  if (modesWrap && !modesWrap.querySelector('[data-mode="3x1"]')) {
    [['3x1', T.threeAcross || '3 across'], ['1x3', T.threeDown || '3 down']].forEach(function (pair) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-mode', pair[0]);
      b.setAttribute('aria-pressed', 'false');
      b.textContent = pair[1];
      modesWrap.appendChild(b);
    });
  }
  var modeBtns = Array.prototype.slice.call(root.querySelectorAll('[data-mode]'));
  var source = null;
  var mode = '2x2';
  var busy = false;

  function say(text) { if (statusEl) statusEl.textContent = text; }
  function modeSize(m) {
    if (m === '2x1') return { cols: 2, rows: 1 };
    if (m === '1x2') return { cols: 1, rows: 2 };
    if (m === '3x1') return { cols: 3, rows: 1 };
    if (m === '1x3') return { cols: 1, rows: 3 };
    if (m === '3x3') return { cols: 3, rows: 3 };
    return { cols: 2, rows: 2 };
  }
  function drawPreview() {
    if (!source || !canvas) return;
    var dims = modeSize(mode);
    var maxW = 720;
    var scale = Math.min(1, maxW / source.naturalWidth);
    canvas.width = Math.round(source.naturalWidth * scale);
    canvas.height = Math.round(source.naturalHeight * scale);
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    grid.style.setProperty('--cols', String(dims.cols));
    grid.style.setProperty('--rows', String(dims.rows));
    say((T.ready || 'Ready: {n} tiles').replace('{n}', String(dims.cols * dims.rows)));
  }
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) { say(T.error || 'Please choose an image file.'); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      source = img;
      root.classList.add('has-image');
      drop.hidden = true;
      workspace.hidden = false;
      drawPreview();
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { say(T.error || 'Could not read this image.'); URL.revokeObjectURL(url); };
    img.src = url;
  }
  function crcTable() {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  }
  var CRC = crcTable();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(entries) {
    var enc = new TextEncoder();
    var parts = [];
    var central = [];
    var offset = 0;
    entries.forEach(function (entry) {
      var name = enc.encode(entry.name);
      var data = entry.data;
      var crc = crc32(data);
      var local = new Uint8Array(30 + name.length);
      var lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0, true); lv.setUint16(8, 0, true);
      lv.setUint16(10, 0, true); lv.setUint16(12, 0, true); lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
      lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true);
      local.set(name, 30);
      parts.push(local, data);
      var cd = new Uint8Array(46 + name.length);
      var cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0, true); cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true); cv.setUint32(42, offset, true);
      cd.set(name, 46);
      central.push(cd);
      offset += local.length + data.length;
    });
    var centralSize = central.reduce(function (sum, part) { return sum + part.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end]), { type: 'application/zip' });
  }
  function canvasToBytes(tile) {
    return new Promise(function (resolve, reject) {
      tile.toBlob(function (blob) {
        if (!blob) { reject(new Error('tile encode failed')); return; }
        blob.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)); }, reject);
      }, 'image/png');
    });
  }
  async function download() {
    if (!source || busy) return;
    busy = true;
    downloadBtn.disabled = true;
    say(T.working || 'Preparing tiles…');
    try {
      var dims = modeSize(mode);
      var w = Math.floor(source.naturalWidth / dims.cols);
      var h = Math.floor(source.naturalHeight / dims.rows);
      var entries = [];
      for (var row = 0; row < dims.rows; row++) {
        for (var col = 0; col < dims.cols; col++) {
          var tile = document.createElement('canvas');
          tile.width = w; tile.height = h;
          tile.getContext('2d').drawImage(source, col * w, row * h, w, h, 0, 0, w, h);
          entries.push({ name: 'tile-' + (row * dims.cols + col + 1) + '.png', data: await canvasToBytes(tile) });
        }
      }
      var zip = zipStore(entries);
      var link = document.createElement('a');
      link.href = URL.createObjectURL(zip);
      link.download = 'split-' + dims.cols + 'x' + dims.rows + '.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1500);
      say((T.done || 'Done: {n} tiles').replace('{n}', String(entries.length)));
    } catch (e) {
      say(T.error || 'Something went wrong. Please try again.');
    } finally {
      busy = false;
      downloadBtn.disabled = false;
    }
  }
  if (pick && input) pick.addEventListener('click', function () { input.click(); });
  if (input) input.addEventListener('change', function (e) { loadFile(e.target.files && e.target.files[0]); });
  if (drop) {
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { loadFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
    drop.addEventListener('click', function (e) { if (e.target === drop) input.click(); });
  }
  modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      mode = btn.getAttribute('data-mode') || '2x2';
      modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      drawPreview();
    });
  });
  if (downloadBtn) downloadBtn.addEventListener('click', download);
  drawPreview();
})();
