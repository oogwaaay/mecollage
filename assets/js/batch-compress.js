/**
 * Batch compress images: scale + quality search, all in the browser.
 * Reuses a small store-only ZIP writer (no dependencies, no upload).
 */
(function () {
  'use strict';
  var root = document.getElementById('batchTool');
  if (!root) return;
  var T = window.MC_BATCH_I18N || {};
  var input = document.getElementById('batchFile');
  var pick = document.getElementById('batchPick');
  var drop = document.getElementById('batchDrop');
  var workspace = document.getElementById('batchWorkspace');
  var widthInput = document.getElementById('batchWidth');
  var kbInput = document.getElementById('batchKb');
  var formatSelect = document.getElementById('batchFormat');
  var processBtn = document.getElementById('batchProcess');
  var downloadBtn = document.getElementById('batchDownload');
  var resultsEl = document.getElementById('batchResults');
  var statusEl = document.getElementById('batchStatus');
  var files = [];
  var outputs = [];
  var busy = false;

  function say(text) { if (statusEl) statusEl.textContent = text; }
  function kb(bytes) { return Math.max(1, Math.round(bytes / 1024)); }
  function addFiles(list) {
    files = files.concat(Array.prototype.slice.call(list || []).filter(function (f) { return /^image\//.test(f.type); }));
    if (!files.length) { say(T.error || 'Choose at least one image.'); return; }
    drop.hidden = true;
    workspace.hidden = false;
    say((T.ready || '{n} images ready').replace('{n}', String(files.length)));
  }
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  function encode(img, maxWidth, targetKb, type) {
    var scale = Math.min(1, maxWidth / img.naturalWidth);
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    var ctx = canvas.getContext('2d');
    if (type === 'image/jpeg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    var quality = 0.86;
    var best = null;
    function attempt(q) {
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) { resolve(blob); }, type, q);
      });
    }
    return (async function () {
      if (!targetKb) {
        best = await attempt(quality);
        return best;
      }
      var low = 0.25, high = 0.95;
      best = await attempt(high);
      if (best && best.size / 1024 <= targetKb) return best;
      for (var i = 0; i < 7; i++) {
        var mid = (low + high) / 2;
        var blob = await attempt(mid);
        if (!blob) break;
        if (blob.size / 1024 <= targetKb) { best = blob; low = mid; } else { high = mid; }
      }
      return best;
    })();
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
  async function processAll() {
    if (!files.length || busy) return;
    busy = true;
    processBtn.disabled = true;
    downloadBtn.disabled = true;
    outputs = [];
    resultsEl.innerHTML = '';
    var maxWidth = Math.max(200, parseInt(widthInput.value, 10) || 1920);
    var targetKb = Math.max(0, parseInt(kbInput.value, 10) || 0);
    var type = formatSelect.value;
    var ext = type === 'image/webp' ? '.webp' : '.jpg';
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var item = document.createElement('li');
      item.textContent = file.name + ' — ' + (T.working || 'processing…');
      resultsEl.appendChild(item);
      try {
        var img = await loadImage(file);
        var blob = await encode(img, maxWidth, targetKb, type);
        if (!blob) throw new Error('encode');
        var name = file.name.replace(/\.[^.]+$/, '') + ext;
        outputs.push({ name: name, data: new Uint8Array(await blob.arrayBuffer()) });
        item.textContent = file.name + ' — ' + kb(file.size) + ' KB → ' + kb(blob.size) + ' KB';
      } catch (e) {
        item.textContent = file.name + ' — ' + (T.failed || 'failed');
      }
    }
    say((T.done || 'Done: {n} files').replace('{n}', String(outputs.length)));
    downloadBtn.disabled = outputs.length === 0;
    processBtn.disabled = false;
    busy = false;
  }
  function downloadZip() {
    if (!outputs.length) return;
    var zip = zipStore(outputs);
    var link = document.createElement('a');
    link.href = URL.createObjectURL(zip);
    link.download = 'compressed-images.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1500);
    say((T.saved || 'ZIP saved: {n} files').replace('{n}', String(outputs.length)));
  }
  if (pick && input) pick.addEventListener('click', function () { input.click(); });
  if (input) input.addEventListener('change', function (e) { addFiles(e.target.files); });
  if (drop) {
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer && e.dataTransfer.files); });
    drop.addEventListener('click', function (e) { if (e.target === drop) input.click(); });
  }
  if (processBtn) processBtn.addEventListener('click', processAll);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadZip);
})();
