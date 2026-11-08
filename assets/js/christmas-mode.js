/* ============================================================================
 * Christmas mode — additive UI for the shared collage editor.
 *
 * Loaded on demand by assets/js/mecollage-main.js only when the editor is
 * opened as /#christmas. Default editor (no hash) never requests this file,
 * so the default editor and the performance budget stay unchanged.
 *
 * 约定：只用 --mc-* token；所有颜色/尺寸在 assets/css/christmas-mode.css。
 * ========================================================================== */
(function () {
  'use strict';

  var BACK_TO_GUIDE = '/christmas-collage-maker/';
  var STICKERS = ['🎄', '🎅', '🎁', '❄️', '☃️', '🔔', '🕯️', '🍪', '🧦', '⭐', '🎀', '🦌', '🥂', '❤️'];
  var PRESETS = [
    { rows: 1, cols: 2, cls: 'xm-lg-12', label: '1×2' },
    { rows: 2, cols: 1, cls: 'xm-lg-21', label: '2×1' },
    { rows: 1, cols: 3, cls: 'xm-lg-13', label: '1×3' },
    { rows: 3, cols: 1, cls: 'xm-lg-31', label: '3×1' },
    { rows: 2, cols: 2, cls: 'xm-lg-22', label: '2×2' },
    { rows: 1, cols: 4, cls: 'xm-lg-14', label: '1×4' },
    { rows: 2, cols: 3, cls: 'xm-lg-23', label: '2×3' },
    { rows: 3, cols: 3, cls: 'xm-lg-33', label: '3×3' }
  ];
  var BACKGROUNDS = ['snow', 'forest', 'pine', 'warm', 'gold'];
  var BACKGROUND_LABELS = { snow: 'Snow', forest: 'Forest', pine: 'Pine', warm: 'Warm', gold: 'Gold' };

  function install(app) {
    if (app.__christmasInstalled) return;
    app.__christmasInstalled = true;
    loadStyles();
    injectBanner();
    injectRatioButton(app);
    injectStickers();
    injectPanel(app);
    applyBackground(app, 'snow');
    // 圣诞拼图默认有一点间距和圆角，背景色才看得出来；用户仍可自由调整
    if (app.gutter === 0 && app.radius === 0) {
      app.gutter = 10;
      app.radius = 10;
      app.updateStyles();
    }
    window.addEventListener('hashchange', function () {
      if (app.isChristmasMode && location.hash !== '#christmas') location.reload();
    });
    syncExportUI(app);
  }

  function loadStyles() {
    if (document.getElementById('christmasModeStyles')) return;
    var link = document.createElement('link');
    link.id = 'christmasModeStyles';
    link.rel = 'stylesheet';
    link.href = '/assets/css/christmas-mode.css';
    document.head.appendChild(link);
  }

  function injectBanner() {
    if (document.getElementById('christmasModeBanner')) return;
    var host = document.querySelector('.collage-tool-container');
    if (!host) return;
    var banner = document.createElement('div');
    banner.id = 'christmasModeBanner';
    banner.className = 'xm-banner';
    banner.innerHTML = '<span class="xm-banner__icon" aria-hidden="true">🎄</span>'
      + '<span class="xm-banner__title">Christmas mode</span>'
      + '<span class="xm-banner__hint">Layout presets, holiday stickers and export sizes are ready. Start with a layout, then pick a background.</span>'
      + '<a class="xm-banner__exit" href="' + BACK_TO_GUIDE + '">Back to the Christmas guide</a>';
    host.insertBefore(banner, host.firstChild);
  }

  function injectRatioButton() {
    var ratioGrid = document.querySelector('.aspect-ratio-grid');
    if (!ratioGrid || ratioGrid.querySelector('[data-ratio="1200:630"]')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aspect-ratio-btn';
    btn.dataset.ratio = '1200:630';
    btn.textContent = '1200×630';
    ratioGrid.appendChild(btn);
  }

  function injectStickers() {
    var stickerGrid = document.querySelector('.sticker-grid');
    if (!stickerGrid) return;
    STICKERS.forEach(function (emoji) {
      if (stickerGrid.querySelector('.sticker-btn[data-sticker="' + emoji + '"]')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sticker-btn christmas-sticker';
      btn.dataset.sticker = emoji;
      btn.textContent = emoji;
      btn.setAttribute('aria-label', 'Christmas sticker ' + emoji);
      stickerGrid.appendChild(btn);
    });
  }

  function injectPanel(app) {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar || document.getElementById('christmasPanel')) return;

    var presetHtml = PRESETS.map(function (preset) {
      var cells = '';
      for (var i = 0; i < preset.rows * preset.cols; i += 1) cells += '<i></i>';
      return '<button type="button" class="xm-preset" data-rows="' + preset.rows + '" data-cols="' + preset.cols + '" title="' + preset.rows + ' × ' + preset.cols + ' grid">'
        + '<span class="xm-mini ' + preset.cls + '" aria-hidden="true">' + cells + '</span>'
        + '<span>' + preset.label + '</span></button>';
    }).join('');

    var swatchHtml = BACKGROUNDS.map(function (bg) {
      return '<button type="button" class="xm-swatch xmas-bg-' + bg + '" data-bg="' + bg + '" aria-label="' + BACKGROUND_LABELS[bg] + ' background" title="' + BACKGROUND_LABELS[bg] + '"></button>';
    }).join('');

    var panel = document.createElement('div');
    panel.id = 'christmasPanel';
    panel.className = 'sidebar-section xm-panel';
    panel.innerHTML = '<div class="xm-panel__head">'
      + '<span class="xm-panel__title">🎄 Christmas mode</span>'
      + '<a class="xm-panel__exit" href="' + BACK_TO_GUIDE + '">Guide</a>'
      + '</div>'
      + '<p class="xm-hint">One-click layout, canvas background and exact export sizes. Everything else works as usual.</p>'
      + '<div class="xm-group"><span class="xm-label">Layout presets</span><div class="xm-presets" role="group" aria-label="Christmas layout presets">' + presetHtml + '</div></div>'
      + '<div class="xm-group"><span class="xm-label">Canvas background</span><div class="xm-swatches" role="group" aria-label="Canvas background">' + swatchHtml + '</div></div>'
      + '<div class="xm-group"><span class="xm-label">Export</span>'
      + '<div class="xm-chips" role="group" aria-label="Export format"><button type="button" class="xm-chip is-active" data-format="png">PNG</button><button type="button" class="xm-chip" data-format="jpg">JPG</button></div>'
      + '<div class="xm-chips" role="group" aria-label="Export size"><button type="button" class="xm-chip" data-size="1080x1080" data-ratio="1:1">1080²</button><button type="button" class="xm-chip" data-size="1080x1920" data-ratio="9:16">Story</button><button type="button" class="xm-chip" data-size="1200x630" data-ratio="1200:630">Card</button></div>'
      + '<button type="button" class="xm-download">Download PNG</button>'
      + '</div>';

    sidebar.insertBefore(panel, sidebar.firstChild);

    panel.querySelectorAll('.xm-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyPreset(app, Number(btn.dataset.rows), Number(btn.dataset.cols), btn);
      });
    });
    panel.querySelectorAll('.xm-swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyBackground(app, btn.dataset.bg);
        panel.querySelectorAll('.xm-swatch').forEach(function (item) {
          item.classList.toggle('is-active', item === btn);
        });
      });
    });
    panel.querySelectorAll('.xm-chip[data-format]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.exportFormat = btn.dataset.format === 'jpg' ? 'jpg' : 'png';
        syncExportUI(app);
      });
    });
    panel.querySelectorAll('.xm-chip[data-size]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.dataset.size.split('x').map(Number);
        setExportSize(app, parts[0], parts[1], btn.dataset.ratio);
      });
    });
    var downloadBtn = panel.querySelector('.xm-download');
    if (downloadBtn) downloadBtn.addEventListener('click', function () { app.exportCollage(); });
  }

  function applyPreset(app, rows, cols, activeButton) {
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) return;
    var capacity = rows * cols;
    if (app.images.length > capacity) {
      app.showErrorToast(
        'toast.error.grid_capacity',
        { capacity: capacity, count: app.images.length },
        'This layout holds ' + capacity + ' photos. You have ' + app.images.length + '.',
      );
      return;
    }
    app.setGridLayoutMode('custom');
    var rowsInput = document.getElementById('gridRowsInput');
    var colsInput = document.getElementById('gridColsInput');
    if (rowsInput) rowsInput.value = String(rows);
    if (colsInput) colsInput.value = String(cols);
    app.customGridRows = rows;
    app.customGridCols = cols;
    app.useCustomGrid = true;
    app.renderCollage();
    app.markDirty();
    var panel = document.getElementById('christmasPanel');
    if (panel) {
      panel.querySelectorAll('.xm-preset').forEach(function (btn) {
        btn.classList.toggle('is-active', btn === activeButton);
      });
    }
  }

  function applyBackground(app, bg) {
    if (BACKGROUNDS.indexOf(bg) < 0) return;
    app.christmasBackground = bg;
    var canvas = document.getElementById('collageGrid');
    if (!canvas) return;
    BACKGROUNDS.forEach(function (name) { canvas.classList.remove('xmas-bg-' + name); });
    canvas.classList.add('xmas-bg-' + bg);
  }

  function setExportSize(app, width, height, ratio) {
    if (!width || !height || !ratio) return;
    app._settingXmasTarget = true;
    app.setAspectRatio(ratio);
    app._settingXmasTarget = false;
    app.exportTarget = { width: width, height: height };
    syncExportUI(app);
  }

  function syncExportUI(app) {
    var panel = document.getElementById('christmasPanel');
    if (!panel) return;
    var format = app.exportFormat === 'jpg' ? 'jpg' : 'png';
    panel.querySelectorAll('.xm-chip[data-format]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.format === format);
    });
    var target = app.exportTarget;
    panel.querySelectorAll('.xm-chip[data-size]').forEach(function (btn) {
      var parts = btn.dataset.size.split('x').map(Number);
      btn.classList.toggle('is-active', Boolean(target) && target.width === parts[0] && target.height === parts[1]);
    });
    var downloadBtn = panel.querySelector('.xm-download');
    if (downloadBtn) downloadBtn.textContent = format === 'jpg' ? 'Download JPG' : 'Download PNG';
    panel.querySelectorAll('.xm-swatch').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.bg === app.christmasBackground);
    });
  }

  window.MeCollageChristmas = { install: install, syncExportUI: syncExportUI };
})();
