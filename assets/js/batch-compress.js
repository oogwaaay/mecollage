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
  var steps = [];
  var stepUi = null;
  var patternInput = null;
  var customRecipes = [];
  var STEP_TYPES = [
    ['crop1x1', '1:1'], ['crop4x5', '4:5'], ['crop9x16', '9:16'], ['crop16x9', '16:9'],
    ['rotate90', '↻ 90°'], ['rotate180', '↻ 180°'], ['rotate270', '↻ 270°'],
    ['flipH', '⇄'], ['flipV', '⇅'], ['border20', '▣ 20'], ['border40', '▣ 40']
  ];
  function t(key, fallback) { return T[key] || fallback; }
  function ensureStepsUi() {
    if (stepUi) return stepUi;
    var host = root.querySelector('.batch-options');
    if (!host) return null;
    var wrap = document.createElement('div');
    wrap.className = 'batch-steps';
    wrap.innerHTML = '<div class="batch-steps-head"><strong>' + t('steps', 'Steps') + '</strong>' +
      '<select id="batchStepType">' + STEP_TYPES.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('') + '</select>' +
      '<button type="button" id="batchStepAdd">' + t('addStep', 'Add step') + '</button></div>' +
      '<ol id="batchStepList" class="batch-step-list"></ol>' +
      '<div class="batch-recipes"><strong>' + t('recipes', 'Recipes') + '</strong><div id="batchRecipeChips" class="batch-recipe-chips"></div>' +
      '<div class="batch-recipe-save"><input id="batchRecipeName" placeholder="' + t('recipePlaceholder', 'Recipe name') + '"><button type="button" id="batchRecipeSave">' + t('saveRecipe', 'Save') + '</button></div></div>' +
      '<div class="batch-pattern"><label>' + t('filename', 'Filename') + ' <input id="batchPattern" value="{name}-{n}" spellcheck="false"></label></div>';
    host.appendChild(wrap);
    patternInput = wrap.querySelector('#batchPattern');
    wrap.querySelector('#batchStepAdd').addEventListener('click', function () {
      var sel = wrap.querySelector('#batchStepType');
      if (sel && sel.value) { steps.push(sel.value); renderSteps(); }
    });
    wrap.querySelector('#batchRecipeSave').addEventListener('click', saveRecipe);
    try { customRecipes = JSON.parse(localStorage.getItem('mc_batch_recipes_v1') || '[]'); } catch (e) { customRecipes = []; }
    renderRecipes();
    stepUi = wrap;
    renderSteps();
    return stepUi;
  }
  function stepLabel(type) {
    for (var i = 0; i < STEP_TYPES.length; i++) if (STEP_TYPES[i][0] === type) return STEP_TYPES[i][1];
    return type;
  }
  function renderSteps() {
    if (!stepUi) return;
    var list = stepUi.querySelector('#batchStepList');
    list.innerHTML = '';
    steps.forEach(function (type, index) {
      var li = document.createElement('li');
      li.className = 'batch-step-item';
      li.innerHTML = '<span>' + stepLabel(type) + '</span><span class="batch-step-actions">' +
        '<button type="button" data-move="-1" aria-label="' + t('moveUp', 'Move up') + '">↑</button>' +
        '<button type="button" data-move="1" aria-label="' + t('moveDown', 'Move down') + '">↓</button>' +
        '<button type="button" data-remove="1" aria-label="' + t('remove', 'Remove') + '">×</button></span>';
      li.querySelectorAll('[data-move]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var dir = Number(btn.getAttribute('data-move'));
          var next = index + dir;
          if (next < 0 || next >= steps.length) return;
          var tmp = steps[index]; steps[index] = steps[next]; steps[next] = tmp;
          renderSteps();
        });
      });
      li.querySelector('[data-remove]').addEventListener('click', function () { steps.splice(index, 1); renderSteps(); });
      list.appendChild(li);
    });
  }
  function recipeList() {
    var builtin = [
      { name: t('recipeSquare', 'Instagram square'), steps: ['crop1x1', 'border20'], width: 1080, kb: 200, format: 'image/jpeg' },
      { name: t('recipeStory', 'Story 9:16'), steps: ['crop9x16'], width: 1080, kb: 300, format: 'image/jpeg' },
      { name: t('recipeUnder', 'Under 200 KB'), steps: [], width: 1600, kb: 200, format: 'image/jpeg' },
      { name: t('recipeBorder', 'White border'), steps: ['border20'], width: 1600, kb: 0, format: 'image/png' }
    ];
    return builtin.concat(customRecipes);
  }
  function applyRecipe(recipe) {
    steps = (recipe.steps || []).slice();
    if (recipe.width && widthInput) widthInput.value = String(recipe.width);
    if (typeof recipe.kb === 'number' && kbInput) kbInput.value = recipe.kb ? String(recipe.kb) : '';
    if (recipe.format && formatSelect) formatSelect.value = recipe.format;
    renderSteps();
  }
  function renderRecipes() {
    if (!stepUi) return;
    var chips = stepUi.querySelector('#batchRecipeChips');
    chips.innerHTML = '';
    recipeList().forEach(function (recipe) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'batch-recipe-chip';
      btn.textContent = recipe.name;
      btn.addEventListener('click', function () { applyRecipe(recipe); });
      chips.appendChild(btn);
    });
  }
  function saveRecipe() {
    var nameEl = stepUi && stepUi.querySelector('#batchRecipeName');
    var name = nameEl && nameEl.value.trim();
    if (!name) return;
    customRecipes.push({ name: name, steps: steps.slice(), width: Number(widthInput.value) || 1920, kb: Number(kbInput.value) || 0, format: formatSelect.value });
    try { localStorage.setItem('mc_batch_recipes_v1', JSON.stringify(customRecipes)); } catch (e) {}
    nameEl.value = '';
    renderRecipes();
  }
  function imageToCanvas(img) {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  }
  function cropRatio(c, ratio) {
    var w = c.width, h = c.height;
    var nextW = w, nextH = h;
    if (w / h > ratio) nextW = Math.round(h * ratio); else nextH = Math.round(w / ratio);
    var out = document.createElement('canvas');
    out.width = nextW; out.height = nextH;
    out.getContext('2d').drawImage(c, (w - nextW) / 2, (h - nextH) / 2, nextW, nextH, 0, 0, nextW, nextH);
    return out;
  }
  function applyStep(c, type) {
    if (type === 'crop1x1') return cropRatio(c, 1);
    if (type === 'crop4x5') return cropRatio(c, 4 / 5);
    if (type === 'crop9x16') return cropRatio(c, 9 / 16);
    if (type === 'crop16x9') return cropRatio(c, 16 / 9);
    var out = document.createElement('canvas');
    var ctx;
    if (type === 'rotate90' || type === 'rotate270') {
      out.width = c.height; out.height = c.width;
      ctx = out.getContext('2d');
      ctx.translate(out.width / 2, out.height / 2);
      ctx.rotate(type === 'rotate90' ? Math.PI / 2 : -Math.PI / 2);
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      return out;
    }
    if (type === 'rotate180') {
      out.width = c.width; out.height = c.height;
      ctx = out.getContext('2d');
      ctx.translate(out.width, out.height); ctx.rotate(Math.PI);
      ctx.drawImage(c, 0, 0);
      return out;
    }
    if (type === 'flipH' || type === 'flipV') {
      out.width = c.width; out.height = c.height;
      ctx = out.getContext('2d');
      if (type === 'flipH') { ctx.translate(out.width, 0); ctx.scale(-1, 1); }
      else { ctx.translate(0, out.height); ctx.scale(1, -1); }
      ctx.drawImage(c, 0, 0);
      return out;
    }
    if (type === 'border20' || type === 'border40') {
      var b = type === 'border20' ? 20 : 40;
      out.width = c.width + b * 2; out.height = c.height + b * 2;
      ctx = out.getContext('2d');
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(c, b, b);
      return out;
    }
    return c;
  }
  function preprocess(img) {
    var c = imageToCanvas(img);
    steps.forEach(function (type) { c = applyStep(c, type); });
    return c;
  }
  function buildName(original, index, w, h, ext) {
    var base = original.replace(/\.[^.]+$/, '');
    var pattern = (patternInput && patternInput.value.trim()) || '{name}-{n}';
    var name = pattern.replace(/\{name\}/g, base)
      .replace(/\{n\}/g, String(index + 1).padStart(2, '0'))
      .replace(/\{w\}/g, String(w)).replace(/\{h\}/g, String(h))
      .replace(/\{format\}/g, ext.replace('.', ''));
    name = name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    if (!new RegExp('\\.' + ext.slice(1) + '$', 'i').test(name)) name += ext;
    return name;
  }

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
  function encode(srcCanvas, maxWidth, targetKb, type) {
    var scale = Math.min(1, maxWidth / srcCanvas.width);
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(srcCanvas.width * scale));
    canvas.height = Math.max(1, Math.round(srcCanvas.height * scale));
    var ctx = canvas.getContext('2d');
    if (type === 'image/jpeg') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(srcCanvas, 0, 0, canvas.width, canvas.height);
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
        var stepCanvas = preprocess(img);
        var blob = await encode(stepCanvas, maxWidth, targetKb, type);
        if (!blob) throw new Error('encode');
        var scale = Math.min(1, maxWidth / stepCanvas.width);
        var outW = Math.max(1, Math.round(stepCanvas.width * scale));
        var outH = Math.max(1, Math.round(stepCanvas.height * scale));
        var name = buildName(file.name, i, outW, outH, ext);
        var data = new Uint8Array(await blob.arrayBuffer());
        var outUrl = URL.createObjectURL(blob);
        var out = { name: name, data: data, url: outUrl, w: outW, h: outH, before: file.size, after: blob.size };
        outputs.push(out);
        item.className = 'batch-result';
        item.innerHTML = '<img class="batch-result-thumb" alt="" src="' + outUrl + '">' +
          '<div class="batch-result-meta"><strong>' + name + '</strong><span>' + kb(file.size) + ' KB → ' + kb(blob.size) + ' KB</span></div>' +
          '<a class="batch-result-download" download="' + name + '" href="' + outUrl + '">' + t('downloadOne', 'Download') + '</a>' +
          '<button type="button" class="batch-result-push">' + t('putCanvas', 'Put on canvas') + '</button>';
        (function (output) {
          item.querySelector('.batch-result-push').addEventListener('click', function () { pushToEditor([output]); });
        })(out);
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
  function pushToEditor(items) {
    if (!items || !items.length) return;
    var data = [];
    var pending = items.length;
    function done() {
      if (--pending > 0) return;
      try {
        localStorage.setItem('mc_handoff_v1', JSON.stringify(data.slice(0, 20)));
      } catch (e) {
        say(t('handoffFail', 'These images are too large to hand off. Try a smaller width or target KB.'));
        return;
      }
      var lang = (document.documentElement.lang || 'en').toLowerCase();
      var prefix = lang.indexOf('zh-tw') === 0 || lang.indexOf('zh-hant') === 0 ? 'tw/' : lang.indexOf('zh') === 0 ? 'zh/' : lang.indexOf('ja') === 0 ? 'ja/' : lang.indexOf('es') === 0 ? 'es/' : '';
      window.open('/' + prefix + '?handoff=1', '_blank');
      say(t('handoffDone', 'Opened the editor with these images.'));
    }
    items.forEach(function (output) {
      fetch(output.url).then(function (res) { return res.blob(); }).then(function (blob) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () { data.push({ url: reader.result, w: output.w, h: output.h }); resolve(); };
          reader.onerror = function () { resolve(); };
          reader.readAsDataURL(blob);
        });
      }).then(done, done);
    });
  }
  function ensurePushAll() {
    if (document.getElementById('batchPushAll') || !downloadBtn || !downloadBtn.parentNode) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'batchPushAll';
    btn.className = 'batch-push-all';
    btn.textContent = t('putAllCanvas', 'Put all on canvas');
    btn.addEventListener('click', function () { pushToEditor(outputs); });
    downloadBtn.parentNode.insertBefore(btn, downloadBtn.nextSibling);
  }
  ensureStepsUi();
  ensurePushAll();

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
