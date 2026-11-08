// MeCollage Pro 主应用程序
// 严格按照交互示意图实现

// ---------------------------------------------------------------------------
// R0 交互反馈工具层（2026-11-06，IMPLEMENTATION-SPEC.md §2.2 / §3.1）
// 约定：
//  1) 反馈优先走 window.mcUI.toast(...)（assets/js/ui.js 提供，可能未加载）；
//  2) 文案优先 window.i18n.t(key, params)，缺键时用英文 fallback；
//  3) ui.js 缺失/异常时降级为「#mc-toast-stack > .mc-toast > .mc-toast__msg」
//     原生 DOM toast（复用 components.css §14 的视觉），并 console.error；
//  4) 任何情况下都不回退阻塞式 alert()。
// ---------------------------------------------------------------------------
const MC_TOAST_DEFAULTS = { type: 'info', duration: 3200 };
const MC_TOAST_MAX = 3;

function mcI18n(key, params, fallback) {
  const values = params || {};
  let text = '';
  const i18n = window.i18n;
  if (i18n && typeof i18n.t === 'function') {
    try {
      const translated = i18n.t(key, values);
      if (translated && translated !== key) text = String(translated);
    } catch (error) {
      console.error(`[MeCollage] i18n.t("${key}") 调用失败：`, error);
    }
  }
  if (!text) {
    text = String(fallback || key);
    Object.keys(values).forEach((name) => {
      text = text.split(`{${name}}`).join(String(values[name]));
    });
  }
  return text;
}

function mcMountToastStack() {
  let stack = document.getElementById('mc-toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'mc-toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  return stack;
}

function mcShowToastFallback(message, options = {}) {
  try {
    const stack = mcMountToastStack();
    const toast = document.createElement('div');
    toast.className = `mc-toast mc-toast--${options.type || MC_TOAST_DEFAULTS.type}`;
    toast.setAttribute('role', 'status');

    const msg = document.createElement('span');
    msg.className = 'mc-toast__msg';
    msg.textContent = String(message);
    toast.appendChild(msg);

    const remove = () => { if (toast.parentNode) toast.parentNode.removeChild(toast); };

    if (options.actionLabel && typeof options.onAction === 'function') {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'mc-toast__action';
      action.textContent = String(options.actionLabel);
      action.addEventListener('click', () => {
        remove();
        try {
          options.onAction();
        } catch (error) {
          console.error('[MeCollage] toast action 执行失败：', error);
        }
      });
      toast.appendChild(action);
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mc-toast__close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    close.addEventListener('click', remove);
    toast.appendChild(close);

    stack.appendChild(toast);
    while (stack.children.length > MC_TOAST_MAX) stack.removeChild(stack.firstElementChild);

    const duration = Number(options.duration ?? MC_TOAST_DEFAULTS.duration);
    if (duration > 0) setTimeout(remove, duration);
    return true;
  } catch (error) {
    console.error('[MeCollage] 内联 toast 渲染失败：', error);
    return false;
  }
}

function mcToast(message, options = {}) {
  const ui = window.mcUI;
  if (ui && typeof ui.toast === 'function') {
    try {
      ui.toast(message, options);
      return true;
    } catch (error) {
      console.error('[MeCollage] mcUI.toast 调用失败，改用内联 toast：', error);
    }
  } else {
    console.error(`[MeCollage] mcUI 未就绪，toast 降级为内联 DOM：${message}`);
  }
  return mcShowToastFallback(message, options);
}

/** 估算 data URL 的字节数（base64 → bytes，用于导出成功 toast 的大小文案） */
function mcEstimateDataUrlBytes(dataUrl) {
  if (typeof dataUrl !== 'string') return 0;
  const commaIndex = dataUrl.indexOf(',');
  const base64 = commaIndex === -1 ? '' : dataUrl.slice(commaIndex + 1);
  return Math.floor((base64.length * 3) / 4);
}

/** 字节数 → 可读大小（KB/MB） */
function mcFormatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

class MeCollagePro {
  // R0：AI 懒加载用的外部库（原首页静态 <script> 已移除，改为 ensureLibs 动态加载）
  static EXTERNAL_LIBS = {
    html2canvas: {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      global: 'html2canvas',
      crossOrigin: 'anonymous',
    },
    ort: {
      url: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/ort.min.js',
      global: 'ort',
      crossOrigin: 'anonymous',
    },
    faceapi: {
      url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js',
      global: 'faceapi',
      crossOrigin: 'anonymous',
    },
  };

  constructor() {
    this.images = [];
    this.maxImages = 20;
    this.currentAspectRatio = '1:1';
    this.gutter = 0;
    this.radius = 0;
    this.isDragging = false;
    this.dragStartIndex = -1;
    this.activeTool = 'layout'; // 当前激活的工具
    this.textLayers = []; // 文字图层
    this.stickerLayers = []; // 贴纸图层
    this.currentFilter = 'none'; // 当前滤镜
    this.selectedImageIndex = -1; // 当前选中的图片索引

    // 拖拽功能相关变量
    this.draggedElement = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.currentDragLayer = null;
    this.currentDragType = null; // 'image', 'text', 'sticker'
    this.gridSize = 20; // 网格吸附大小
    this.snapToGrid = true; // 是否启用网格吸附
    this.allowOverlap = true; // 是否允许元素重叠
    this.undoStack = []; // 撤销栈
    this.redoStack = []; // 重做栈
    this.dragAnimationFrame = null; // 拖拽动画帧ID

    // 大小调整和旋转相关变量
    this.isResizing = false;
    this.isRotating = false;
    this.resizeHandle = null;
    this.rotateHandle = null;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.rotateStartAngle = 0;
    this.currentScale = 1;
    this.currentRotation = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;

    // 自定义网格布局相关变量
    // 自定义网格布局相关变量
    this.useCustomGrid = false; // 是否使用自定义网格
    this.customGridRows = 3; // 自定义行数
    this.customGridCols = 3; // 自定义列数

    // AI 相关变量
    this.isAiModelsLoaded = false;
    this.isProcessingAi = false;

    // R0 交互状态（2026-11-06）
    this.isExporting = false; // 导出中：防连点 + 按钮 aria-busy
    this._unsavedChanges = false; // 未导出改动：beforeunload 保护
    this._libPromises = {}; // ensureLibs() 动态加载缓存（失败清除，允许重试）
    this._touchReorder = null; // 触控拖拽排序的进行中状态

    // Christmas mode（/#christmas 深链）：默认关闭；开启后只做加法式 UI/导出增强
    this.isChristmasMode = false;
    this.christmasBackground = 'snow';
    this.exportFormat = 'png';
    this.exportTarget = null;
    this._settingXmasTarget = false;

    this.init();
  }

  /**
   * 初始化应用程序
   */
  init() {
    this.bindEvents();
    this.updateStyles();
    this.setupChristmasMode();
    // 使用setTimeout确保DOM元素已经完全加载
    setTimeout(() => {
      this.initUIState();
    }, 0);
  }

  /**
   * 初始化UI状态，确保未上传图片时只显示上传界面
   */
  initUIState() {
    // 直接获取并隐藏侧边栏
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.display = 'none';
    }
    
    // 直接获取并隐藏底部工具栏
    const bottomToolbar = document.querySelector('.bottom-toolbar');
    if (bottomToolbar) {
      bottomToolbar.style.display = 'none';
    }
    
    // 直接获取并隐藏导出按钮
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.style.display = 'none';
    }
    
    // 确保上传界面可见
    const uploadScreen = document.getElementById('uploadScreen');
    if (uploadScreen) {
      uploadScreen.style.display = 'block';
    }
    
    // 确保画布区域隐藏
    const collageCanvas = document.getElementById('collageCanvas');
    if (collageCanvas) {
      collageCanvas.style.display = 'none';
    }

    // R0：同步可见 Undo/Redo 的禁用态（初始均为 disabled）
    this.updateUndoRedoState();
  }

  /**
   * 绑定所有事件监听器
   */
  bindEvents() {
    // 文件上传相关事件
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // 点击上传区域
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // 文件选择
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    
    // 拖放上传
    uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
    uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
    
    // 纵横比选择
    const aspectRatioBtns = document.querySelectorAll('.aspect-ratio-btn');
    aspectRatioBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ratio = e.target.dataset.ratio;
        this.setAspectRatio(ratio);
      });
    });
    
    // 间距滑块
    const gutterSlider = document.getElementById('gutterSlider');
    const gutterValue = document.getElementById('gutterValue');
    gutterSlider.addEventListener('input', (e) => {
      this.gutter = parseInt(e.target.value);
      gutterValue.textContent = `${this.gutter}px`;
      this.updateStyles();
    });
    
    // 圆角滑块
    const radiusSlider = document.getElementById('radiusSlider');
    const radiusValue = document.getElementById('radiusValue');
    
    // 添加input事件监听器，处理滑动调整
    radiusSlider.addEventListener('input', (e) => {
      this.radius = parseInt(e.target.value);
      radiusValue.textContent = `${this.radius}px`;
      this.updateStyles();
    });
    
    // 添加change事件监听器，确保鼠标释放时也能更新
    radiusSlider.addEventListener('change', (e) => {
      this.radius = parseInt(e.target.value);
      radiusValue.textContent = `${this.radius}px`;
      this.updateStyles();
    });
    
    // 添加mousedown、mousemove和mouseup事件监听器，增强滑动体验
    let isDraggingSlider = false;
    
    radiusSlider.addEventListener('mousedown', (e) => {
      isDraggingSlider = true;
      // 更新值以响应初始点击
      const rect = radiusSlider.getBoundingClientRect();
      const percentage = (e.clientX - rect.left) / rect.width;
      const value = Math.round(percentage * (radiusSlider.max - radiusSlider.min) + parseInt(radiusSlider.min));
      this.radius = value;
      radiusSlider.value = value;
      radiusValue.textContent = `${this.radius}px`;
      this.updateStyles();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDraggingSlider) {
        const rect = radiusSlider.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const value = Math.round(percentage * (radiusSlider.max - radiusSlider.min) + parseInt(radiusSlider.min));
        this.radius = value;
        radiusSlider.value = value;
        radiusValue.textContent = `${this.radius}px`;
        this.updateStyles();
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDraggingSlider = false;
    });
    
    // 确保滑块初始值正确显示
    radiusSlider.value = this.radius;
    radiusValue.textContent = `${this.radius}px`;
    
    // 导出按钮
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCollage());
    }
    
    // 底部工具栏按钮
    const layoutBtn = document.getElementById('layoutBtn');
    const filterBtn = document.getElementById('filterBtn');
    const textBtn = document.getElementById('textBtn');
    const stickerBtn = document.getElementById('stickerBtn');
    
    layoutBtn.addEventListener('click', () => this.activateTool('layout'));
    filterBtn.addEventListener('click', () => this.activateTool('filter'));
    textBtn.addEventListener('click', () => this.activateTool('text'));
    stickerBtn.addEventListener('click', () => this.activateTool('sticker'));
    
    // 滤镜按钮
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        this.applyFilter(filter);
      });
    });

    // 添加文字按钮
    const addTextBtn = document.getElementById('addTextBtn');
    if (addTextBtn) {
      addTextBtn.addEventListener('click', () => this.addTextLayer());
    }

    // 自定义网格布局模式切换
    const layoutModeBtns = document.querySelectorAll('.layout-mode-btn');
    layoutModeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        this.setGridLayoutMode(mode);
      });
    });

    // 应用自定义网格按钮
    const applyGridBtn = document.getElementById('applyGridBtn');
    if (applyGridBtn) {
      applyGridBtn.addEventListener('click', () => this.applyCustomGrid());
    }

    // AI 功能按钮
    const aiBtn = document.getElementById('aiBtn');
    const aiFaceCenterBtn = document.getElementById('aiFaceCenterBtn');
    const aiBgRemovalBtn = document.getElementById('aiBgRemovalBtn');

    if (aiBtn) {
      aiBtn.addEventListener('click', () => this.activateTool('ai'));
    }

    if (aiFaceCenterBtn) {
      aiFaceCenterBtn.addEventListener('click', () => this.applySmartFaceCenter());
    }

    if (aiBgRemovalBtn) {
      aiBgRemovalBtn.addEventListener('click', () => this.applyAiBgRemoval());
    }

    // R0：可见撤销/重做按钮（P1-2；快捷键仍由 handleKeyDown 处理）
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this.redo());
    }

    // R0：未保存保护（P1-3）：有未导出的拼图时离开/刷新给出提示
    window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));

    // 拖拽使用 Pointer Events：鼠标/触屏/触控笔统一走 pointermove/up（触屏拖贴纸/文字）
    document.addEventListener('pointermove', (e) => this.handleGlobalMouseMove(e));
    document.addEventListener('pointerup', () => this.handleGlobalMouseUp());
    document.addEventListener('pointercancel', () => this.handleGlobalMouseUp());
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /**
   * 处理文件选择
   */
  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.processFiles(files);
    // 允许再次选择同一文件（否则 change 不会触发）
    e.target.value = '';
  }

  /**
   * 处理拖放上传 - 拖入
   */
  handleDragOver(e) {
    e.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.add('drag-over');
  }

  /**
   * 处理拖放上传 - 拖出
   */
  handleDragLeave(e) {
    e.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    // 检查鼠标是否完全离开上传区域
    if (!uploadArea.contains(e.relatedTarget)) {
      uploadArea.classList.remove('drag-over');
    }
  }

  /**
   * 处理拖放上传 - 放置
   */
  handleDrop(e) {
    e.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    this.processFiles(files);
  }

  /**
   * 处理图片文件
   */
  processFiles(files) {
    // 限制最多20张图片
    const remainingSlots = this.maxImages - this.images.length;
    if (remainingSlots <= 0) {
      this.showErrorToast(
        'toast.error.max_images',
        { max: this.maxImages },
        `You can add up to ${this.maxImages} images per collage.`,
      );
      return;
    }
    if (files.length > remainingSlots) {
      this.showInfoToast(
        'photos.remaining',
        { n: remainingSlots },
        `You can add ${remainingSlots} more photo(s) (max ${this.maxImages}).`,
      );
    }
    const filesToProcess = files.slice(0, remainingSlots);
    if (filesToProcess.length === 0) return;

    // 批次全部 settle（成功/失败）后只做一次过渡，避免每张图都滚动/弹 toast
    let settled = 0;
    let added = 0;
    const finishOne = () => {
      settled += 1;
      if (settled < filesToProcess.length) return;
      if (added > 0) {
        this.markDirty();
        this.announcePhotosAdded(added);
      }
    };

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onerror = () => {
        this.showErrorToast(
          'toast.error.file_read',
          { name: file.name },
          `Could not read "${file.name}". Please try another image.`,
        );
        finishOne();
      };
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.images.push({
            file,
            url: e.target.result,
            width: img.width,
            height: img.height,
            filter: 'none' // 初始滤镜
          });
          added += 1;
          this.updateImageCount();
          this.renderCollage();
          this.showCollageCanvas();
          this.updateUndoRedoState();
          finishOne();
        };
        img.onerror = () => {
          // HEIC/损坏文件在多数浏览器无法解码：给出明确反馈，避免“选了文件没反应”
          this.showErrorToast(
            'toast.error.file_decode',
            { name: file.name },
            `Could not decode "${file.name}". Supported formats: PNG, JPG, WEBP.`,
          );
          finishOne();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * R0：标记存在未保存改动（beforeunload 保护用）
   */
  markDirty() {
    this._unsavedChanges = true;
  }

  /**
   * R0：未保存保护（P1-3）。导出成功后解除。
   */
  handleBeforeUnload(e) {
    if (!this._unsavedChanges || this.images.length === 0) return undefined;
    const message = mcI18n('beforeunload.unsaved', {}, 'You have unsaved changes. Export your collage before leaving?');
    e.preventDefault();
    e.returnValue = message; // 兼容旧浏览器
    return message;
  }

  /**
   * R0：图片添加完成后的过渡（P0-4）：滚动到画布 + 聚焦 + toast
   * 优先用 window.mcUI.announcePhotosAdded；ui.js 未就绪时本地降级。
   */
  announcePhotosAdded(count) {
    const ui = window.mcUI;
    if (ui && typeof ui.announcePhotosAdded === 'function') {
      try {
        ui.announcePhotosAdded(count);
        return;
      } catch (error) {
        console.error('[MeCollage] mcUI.announcePhotosAdded 调用失败，改用本地过渡：', error);
      }
    }
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
      try {
        canvasContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (error) {
        canvasContainer.scrollIntoView();
      }
      if (!canvasContainer.hasAttribute('tabindex')) canvasContainer.setAttribute('tabindex', '-1');
      try {
        canvasContainer.focus({ preventScroll: true });
      } catch (error) {
        canvasContainer.focus();
      }
    }
    mcToast(
      mcI18n('toast.photos_added', { n: count }, `${count} photo(s) added — arrange, filter and export when ready.`),
      { type: 'success' },
    );
  }

  /**
   * R0：非阻塞错误反馈（替代 alert），可选 retry action
   */
  showErrorToast(key, params, fallback, options = {}) {
    const message = mcI18n(key, params, fallback);
    console.error(`[MeCollage] ${message}`);
    mcToast(message, { type: 'error', duration: 6000, ...options });
    return message;
  }

  /**
   * R0：非阻塞信息反馈（替代 alert）
   */
  showInfoToast(key, params, fallback, options = {}) {
    const message = mcI18n(key, params, fallback);
    mcToast(message, { type: 'info', ...options });
    return message;
  }

  /**
   * R0：同步可见 Undo/Redo 按钮的禁用态（P1-2）
   */
  updateUndoRedoState() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }

  /**
   * R0：动态加载外部库（AI 懒加载，P1-5）。只加载一次；失败可重试。
   * @param {Array<'html2canvas'|'ort'|'faceapi'>} names
   * @returns {Promise<void>}
   */
  ensureLibs(names = []) {
    const order = ['html2canvas', 'ort', 'faceapi'];
    const requested = order.filter(name => names.includes(name));
    return requested.reduce(
      (chain, name) => chain.then(() => this.loadLib(name)),
      Promise.resolve(),
    );
  }

  /**
   * 加载单个外部库（缓存 Promise；成功后复用，失败后清除以便重试）
   */
  loadLib(name) {
    const config = MeCollagePro.EXTERNAL_LIBS[name];
    if (!config) return Promise.reject(new Error(`Unknown library: ${name}`));
    if (window[config.global]) return Promise.resolve();

    if (this._libPromises[name]) return this._libPromises[name];

    const promise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-mc-lib="${name}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${name}`)));
        return;
      }
      const script = document.createElement('script');
      script.src = config.url;
      script.async = false;
      if (config.crossOrigin) script.crossOrigin = config.crossOrigin;
      script.dataset.mcLib = name;
      script.addEventListener('load', () => {
        if (window[config.global]) {
          resolve();
        } else {
          reject(new Error(`${name} loaded without exposing window.${config.global}`));
        }
      });
      script.addEventListener('error', () => {
        script.remove();
        reject(new Error(`Failed to load ${name}`));
      });
      document.head.appendChild(script);
    });

    this._libPromises[name] = promise.catch((error) => {
      delete this._libPromises[name]; // 允许重试
      throw error;
    });
    return this._libPromises[name];
  }

  /**
   * 隐藏侧边栏功能区
   */
  hideSidebarSections() {
    document.getElementById('layoutSection').style.display = 'none';
    document.getElementById('filterSection').style.display = 'none';
    document.getElementById('textSection').style.display = 'none';
    document.getElementById('stickerSection').style.display = 'none';
  }

  /**
   * 显示侧边栏功能区
   */
  showSidebarSections() {
    // 显示布局功能区作为默认选项
    this.activateTool('layout');
  }

  /**
   * 隐藏底部工具栏
   */
  hideBottomToolbar() {
    const bottomToolbar = document.querySelector('.bottom-toolbar');
    if (bottomToolbar) {
      bottomToolbar.style.display = 'none';
    }
  }

  /**
   * 显示底部工具栏
   */
  showBottomToolbar() {
    const bottomToolbar = document.querySelector('.bottom-toolbar');
    if (bottomToolbar) {
      bottomToolbar.style.display = 'flex';
    }
  }

  /**
   * 隐藏导出按钮
   */
  hideExportButton() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.style.display = 'none';
    }
  }

  /**
   * 显示导出按钮
   */
  showExportButton() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.style.display = 'block';
    }
  }

  /**
   * 隐藏拼图画布
   */
  hideCollageCanvas() {
    const collageCanvas = document.getElementById('collageCanvas');
    if (collageCanvas) {
      collageCanvas.style.display = 'none';
    }
  }

  /**
   * 显示拼图画布，隐藏上传界面
   */
  showCollageCanvas() {
    const uploadScreen = document.getElementById('uploadScreen');
    const collageCanvas = document.getElementById('collageCanvas');
    
    uploadScreen.style.display = 'none';
    collageCanvas.style.display = 'flex';
    
    // 显示侧边栏
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.display = 'block';
    }
    
    // 显示所有功能区域
    this.showSidebarSections();
    
    // 显示底部工具栏
    const bottomToolbar = document.querySelector('.bottom-toolbar');
    if (bottomToolbar) {
      bottomToolbar.style.display = 'flex';
    }
    
    // 显示导出按钮
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.style.display = 'block';
    }
  }

  /**
   * 更新图片计数器
   */
  updateImageCount() {
    const photoCounter = document.getElementById('photoCounter');
    photoCounter.textContent = `${this.images.length} / ${this.maxImages} PHOTOS`;
  }

  /**
   * 设置纵横比
   */
  setAspectRatio(ratio) {
    this.currentAspectRatio = ratio;

    // 更新按钮状态（Christmas 模式会注入 1200:630 按钮；缺失时不要报错）
    document.querySelectorAll('.aspect-ratio-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeRatioButton = document.querySelector(`[data-ratio="${ratio}"]`);
    if (activeRatioButton) activeRatioButton.classList.add('active');

    this.renderCollage();
    this.markDirty();

    // 手动改比例后，旧的固定导出尺寸不再匹配；清空并等待用户重新选尺寸
    if (this.isChristmasMode && !this._settingXmasTarget) {
      this.exportTarget = null;
      this._syncChristmasExportUI();
    }
  }

  /**
   * 更新CSS变量
   */
  updateStyles() {
    const root = document.documentElement;
    root.style.setProperty('--gutter', `${this.gutter}px`);
    root.style.setProperty('--radius', `${this.radius}px`);
    this.markDirty();
  }
  /**
   * 根据图片数量和纵横比计算网格布局
   */
  calculateGridLayout() {
    // 自定义网格：容量校验已在 applyCustomGrid() 完成
    if (this.useCustomGrid) {
      return { rows: this.customGridRows, cols: this.customGridCols };
    }

    const imageCount = this.images.length;
    if (imageCount <= 1) return { rows: 1, cols: 1 };

    // 需要为“+”按钮预留一个格子（20 张时没有按钮）
    const hasAdd = imageCount < this.maxImages;
    const items = imageCount + (hasAdd ? 1 : 0);

    const ratioParts = this.currentAspectRatio.split(':').map(Number);
    const ratio = (ratioParts[0] || 1) / (ratioParts[1] || 1);

    // 在 1..8 行列内搜索：容量必须 >= items；尽量少空格、单元格接近正方形
    let best = null;
    for (let rows = 1; rows <= 8; rows++) {
      for (let cols = 1; cols <= 8; cols++) {
        const capacity = rows * cols;
        if (capacity < items) continue;
        const empty = capacity - items;
        const cellAspect = (ratio * rows) / cols;
        const score = empty * 0.8 + Math.pow(Math.log(cellAspect), 2) * 2 + Math.abs(rows - cols) * 0.01;
        if (!best || score < best.score) best = { rows, cols, score };
      }
    }
    return best ? { rows: best.rows, cols: best.cols } : { rows: Math.ceil(items / 5), cols: 5 };
  }

  /**
   * 渲染拼图
   */
  renderCollage() {
    const collageGrid = document.getElementById('collageGrid');
    const collageCanvas = document.getElementById('collageCanvas');
    if (!collageGrid || !collageCanvas) return;

    // 清理上一次单独渲染的“+”容器（1 张图时放在网格外）
    collageCanvas.querySelectorAll('.standalone-add-container').forEach(el => el.remove());

    let { rows, cols } = this.calculateGridLayout();
    // 自定义网格（含 Christmas 预设）容量小于照片数时回退自动布局，避免网格溢出
    if (this.useCustomGrid && this.images.length > rows * cols) {
      const savedUseCustomGrid = this.useCustomGrid;
      this.useCustomGrid = false;
      ({ rows, cols } = this.calculateGridLayout());
      this.useCustomGrid = savedUseCustomGrid;
    }

    const ratioParts = this.currentAspectRatio.split(':').map(Number);
    const exactRatio = (ratioParts[0] || 1) / (ratioParts[1] || 1);

    // 依据视口计算画布尺寸：既严格保持所选比例，又保证移动端不被裁切
    const viewportW = Math.max(240, window.innerWidth - 48);
    const viewportH = Math.max(240, window.innerHeight - 260);
    const maxW = Math.min(600, viewportW);
    const maxH = Math.min(600, viewportH);
    let targetWidth, targetHeight;
    if (exactRatio >= 1) {
      targetWidth = maxW;
      targetHeight = Math.round(maxW / exactRatio);
      if (targetHeight > maxH) {
        targetHeight = maxH;
        targetWidth = Math.round(maxH * exactRatio);
      }
    } else {
      targetHeight = maxH;
      targetWidth = Math.round(maxH * exactRatio);
      if (targetWidth > maxW) {
        targetWidth = maxW;
        targetHeight = Math.round(maxW / exactRatio);
      }
    }
    targetWidth = Math.max(120, targetWidth);
    targetHeight = Math.max(120, targetHeight);

    // 覆盖 .collage-grid 的 max-height:500px / padding:1rem（否则比例会被截断、内容区比例偏移）
    collageGrid.style.maxHeight = 'none';
    collageGrid.style.padding = '0';
    collageGrid.style.width = `${targetWidth}px`;
    collageGrid.style.height = `${targetHeight}px`;
    collageGrid.style.aspectRatio = `${ratioParts[0]} / ${ratioParts[1]}`;
    collageGrid.innerHTML = '';

    // 自定义网格填满后不再渲染“+”，避免第 N+1 个格子把网格撑出画布
    const hasAdd = this.images.length < this.maxImages && (!this.useCustomGrid || this.images.length < rows * cols);

    if (this.images.length === 1) {
      // 单图：铺满整个画布；“+”按钮放到网格外，避免占用一行导致图片被压扁
      rows = 1;
      cols = 1;
      collageGrid.style.gridTemplateRows = '1fr';
      collageGrid.style.gridTemplateColumns = '1fr';
      const imageContainer = this.createImageContainer(0);
      imageContainer.style.width = '100%';
      imageContainer.style.height = '100%';
      collageGrid.appendChild(imageContainer);

      if (hasAdd) {
        const addBtn = this.createAddImageButton();
        const wrap = document.createElement('div');
        wrap.className = 'standalone-add-container';
        wrap.style.cssText = 'display:flex;justify-content:center;align-items:center;width:100%;height:84px;margin-top:12px;';
        addBtn.style.width = '64px';
        addBtn.style.height = '64px';
        addBtn.style.minWidth = '64px';
        addBtn.style.minHeight = '64px';
        wrap.appendChild(addBtn);
        collageCanvas.appendChild(wrap);
      }
    } else {
      collageGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      collageGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      for (let i = 0; i < this.images.length; i++) {
        collageGrid.appendChild(this.createImageContainer(i));
      }
      if (hasAdd) {
        const addBtn = this.createAddImageButton();
        addBtn.style.width = '100%';
        addBtn.style.height = '100%';
        addBtn.style.minWidth = '100%';
        addBtn.style.minHeight = '100%';
        collageGrid.appendChild(addBtn);
      }
    }

    // 记录单元格宽高比，供 AI 人脸居中计算 object-position
    this._cellAspect = (targetWidth / cols) / (targetHeight / rows);

    // 渲染文字/贴纸图层
    this.renderTextLayers();
    this.renderStickerLayers();
    this.updateDeleteButtonsPosition();
  }

  /**
   * 更新所有删除按钮的位置
   */
  updateDeleteButtonsPosition() {
    const imageContainers = document.querySelectorAll('.image-container');
    imageContainers.forEach((container, index) => {
      const removeBtn = container.querySelector('.remove-btn');
      if (removeBtn) {
        // 计算按钮位置，确保不会被圆形容器裁剪
        const containerRect = container.getBoundingClientRect();
        const gridRect = container.parentElement.getBoundingClientRect();
        
        // 设置按钮位置，使其完全可见
        removeBtn.style.top = '0';
        removeBtn.style.right = '0';
        removeBtn.style.transform = 'translate(0, 0)';
      }
    });
  }
  
  /**
   * 处理全局鼠标移动
   */
  handleGlobalMouseMove(e) {
    if (!this.isDragging || !this.draggedElement) return;
    
    // 直接处理拖拽移动，不使用requestAnimationFrame，确保响应灵敏
    this.performDragMove(e);
  }
  
  /**
   * 执行拖拽移动逻辑
   */
  performDragMove(e) {
    const collageCanvas = document.getElementById('collageCanvas');
    const collageGrid = document.getElementById('collageGrid');
    const canvasRect = collageCanvas.getBoundingClientRect();
    const gridRect = collageGrid.getBoundingClientRect();
    
    // 计算collageGrid在collageCanvas中的相对位置
    const gridLeft = gridRect.left - canvasRect.left;
    const gridTop = gridRect.top - canvasRect.top;
    
    // 计算相对于画布的位置
    let x = e.clientX - canvasRect.left;
    let y = e.clientY - canvasRect.top;
    
    // 应用偏移量 - 减去偏移量以获得元素左上角的正确位置
    x -= this.dragOffsetX;
    y -= this.dragOffsetY;
    
    // 限制拖拽范围在collageGrid内
    x = Math.max(gridLeft, Math.min(x, gridLeft + gridRect.width));
    y = Math.max(gridTop, Math.min(y, gridTop + gridRect.height));
    
    // 网格吸附
    if (this.snapToGrid) {
      x = Math.round(x / this.gridSize) * this.gridSize;
      y = Math.round(y / this.gridSize) * this.gridSize;
    }
    
    // 更新拖拽元素的位置
    this.draggedElement.style.left = `${x}px`;
    this.draggedElement.style.top = `${y}px`;
    
    // 更新当前拖拽图层的数据，基于collageGrid的相对位置
    const relativeX = (x - gridLeft) / gridRect.width;
    const relativeY = (y - gridTop) / gridRect.height;
    
    if (this.currentDragType === 'text') {
      this.currentDragLayer.x = relativeX;
      this.currentDragLayer.y = relativeY;
    } else if (this.currentDragType === 'sticker') {
      this.currentDragLayer.x = relativeX;
      this.currentDragLayer.y = relativeY;
    }
    
    // 显示实时位置反馈
    const positionFeedback = document.getElementById('positionFeedback');
    if (positionFeedback) {
      const percentageX = Math.round(relativeX * 100);
      const percentageY = Math.round(relativeY * 100);
      positionFeedback.textContent = `X: ${Math.round(x - gridLeft)}px (${percentageX}%), Y: ${Math.round(y - gridTop)}px (${percentageY}%)`;
      positionFeedback.style.display = 'block';
    }
  }
  
  /**
   * 处理全局鼠标释放
   */
  handleGlobalMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedElement = null;
      this.currentDragLayer = null;
      this.currentDragType = null;
      
      // 拖拽前已在 startDrag() 记录快照，这里只做清理
      
      // 隐藏实时位置反馈
      const positionFeedback = document.getElementById('positionFeedback');
      positionFeedback.style.display = 'none';
    }
  }
  
  /**
   * 处理键盘事件
   */
  handleKeyDown(e) {
    // 撤销/重做功能
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo(); else this.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.redo();
    }
  }
  
  /**
   * 保存当前状态到撤销栈
   */
  snapshot() {
    return {
      images: this.images.map(img => ({ ...img })),
      textLayers: JSON.parse(JSON.stringify(this.textLayers)),
      stickerLayers: JSON.parse(JSON.stringify(this.stickerLayers)),
      currentAspectRatio: this.currentAspectRatio,
      gutter: this.gutter,
      radius: this.radius
    };
  }

  saveState() {
    this.undoStack.push(this.snapshot());
    this.redoStack = []; // 清空重做栈
    if (this.undoStack.length > 20) this.undoStack.shift();
    this.markDirty();
    this.updateUndoRedoState();
  }
  
  /**
   * 撤销操作
   */
  undo() {
    if (this.undoStack.length === 0) return;
    
    // 保存当前状态到重做栈
    this.redoStack.push(this.snapshot());
    
    // 恢复上一个状态
    const prevState = this.undoStack.pop();
    this.images = prevState.images;
    this.textLayers = prevState.textLayers;
    this.stickerLayers = prevState.stickerLayers;
    this.currentAspectRatio = prevState.currentAspectRatio;
    this.gutter = prevState.gutter;
    this.radius = prevState.radius;
    
    // 重新渲染
    this.renderCollage();
    this.updateUndoRedoState();
    this.markDirty();
    mcToast(mcI18n('toast.undo_success', {}, 'Undone'), { type: 'undo', duration: 2400 });
  }
  
  /**
   * 重做操作
   */
  redo() {
    if (this.redoStack.length === 0) return;
    
    // 保存当前状态到撤销栈
    this.undoStack.push(this.snapshot());
    
    // 恢复下一个状态
    const nextState = this.redoStack.pop();
    this.images = nextState.images;
    this.textLayers = nextState.textLayers;
    this.stickerLayers = nextState.stickerLayers;
    this.currentAspectRatio = nextState.currentAspectRatio;
    this.gutter = nextState.gutter;
    this.radius = nextState.radius;
    
    // 重新渲染
    this.renderCollage();
    this.updateUndoRedoState();
    this.markDirty();
  }
  
  /**
   * 开始拖拽元素
   */
  startDrag(element, layer, type, e) {
    // 记录拖拽前的状态，保证第一次 Ctrl+Z 能回到拖拽前
    this.saveState();
    this.isDragging = true;
    this.draggedElement = element;
    this.currentDragLayer = layer;
    this.currentDragType = type;
    
    // 获取元素当前位置
    const rect = element.getBoundingClientRect();
    const collageCanvas = document.getElementById('collageCanvas');
    const canvasRect = collageCanvas.getBoundingClientRect();
    
    // 使用鼠标事件的精确坐标计算拖拽偏移量
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    const elementX = rect.left - canvasRect.left;
    const elementY = rect.top - canvasRect.top;
    
    // 计算鼠标在元素内的相对位置作为偏移量
    this.dragOffsetX = mouseX - elementX;
    this.dragOffsetY = mouseY - elementY;
    
    // 添加拖拽样式
    element.style.cursor = 'grabbing';
    element.style.zIndex = '1000';
  }

  /**
   * 计算 object-position（%），把检测到的人脸中心放到单元格中心。
   * cover 模式下：faceFraction 在可视窗口中心 → p = (f - visible/2) / (1 - visible)
   */
  computeObjectPosition(image, cellAspect) {
    const face = image.faceCenter;
    if (!face) return '50% 50%';
    const imgW = image.width || 1;
    const imgH = image.height || 1;
    const imgAspect = imgW / imgH;
    const ac = cellAspect > 0 ? cellAspect : 1;
    const fx = Math.max(0, Math.min(1, face.x / 100));
    const fy = Math.max(0, Math.min(1, face.y / 100));
    let posX = 50, posY = 50;
    if (imgAspect > ac) {
      const visible = ac / imgAspect;
      if (visible < 1) posX = ((fx - visible / 2) / (1 - visible)) * 100;
    } else if (imgAspect < ac) {
      const visible = imgAspect / ac;
      if (visible < 1) posY = ((fy - visible / 2) / (1 - visible)) * 100;
    }
    posX = Math.max(0, Math.min(100, posX));
    posY = Math.max(0, Math.min(100, posY));
    return `${posX}% ${posY}%`;
  }

  /**
   * 创建图片容器
   */
  createImageContainer(index) {
    // 创建外层容器，用于放置删除按钮
    const outerContainer = document.createElement('div');
    outerContainer.className = 'image-outer-container';
    outerContainer.style.position = 'relative';
    outerContainer.style.display = 'inline-block';
    outerContainer.style.minHeight = '0';
    outerContainer.draggable = true;
    
    // 创建内层容器，用于显示图片和应用圆角
    const innerContainer = document.createElement('div');
    innerContainer.className = 'image-inner-container';
    innerContainer.style.position = 'relative';
    innerContainer.style.overflow = 'hidden';
    innerContainer.style.borderRadius = `var(--radius, 0px)`;
    innerContainer.style.minHeight = '100px';
    // R0：底色走 token（深色玻璃），不再写裸色值
    innerContainer.style.backgroundColor = 'var(--mc-surface-1)';
    
    // 添加图片
    const img = document.createElement('img');
    const image = this.images[index];
    img.src = image.url;
    img.alt = `Image ${index + 1}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.transition = 'transform 0.2s ease';
    
    // 应用智能人脸居中
    if (image.faceCenter) {
      img.style.objectPosition = this.computeObjectPosition(image, this._cellAspect || 1);
    }
    
    // 应用滤镜
    img.style.filter = this.getFilterStyle(image.filter);
    innerContainer.appendChild(img);
    
    // 添加拖拽手柄组件
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    // R0：从拖拽手柄起手时不让页面滚动抢走手势（触控排序）；手柄区域很小，不影响页面滚动
    dragHandle.style.touchAction = 'none';
    dragHandle.setAttribute('aria-hidden', 'true');
    
    // 添加白点
    const dots = document.createElement('div');
    dots.className = 'drag-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    
    dragHandle.appendChild(dots);
    innerContainer.appendChild(dragHandle);
    
    // 添加删除按钮 - 放在外层容器，避免被裁剪
    // R0：颜色/背景/边框/阴影改由 components.css 的 .remove-btn 接管（含 44px ::after 热区），
    //     这里只保留定位/尺寸/透明度/变换/事件状态等布局与行为样式。
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '🗑️';
    removeBtn.title = 'Remove image';
    removeBtn.setAttribute('aria-label', mcI18n('app.remove_image', {}, 'Remove image'));
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '-0.25rem';
    removeBtn.style.right = '-0.25rem';
    removeBtn.style.width = '1.5rem';
    removeBtn.style.height = '1.5rem';
    removeBtn.style.fontSize = '0.75rem';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.display = 'flex';
    removeBtn.style.alignItems = 'center';
    removeBtn.style.justifyContent = 'center';
    removeBtn.style.opacity = '0';
    removeBtn.style.transform = 'translate(0, 0)';
    removeBtn.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    removeBtn.style.zIndex = '100';
    removeBtn.style.pointerEvents = 'none';
    removeBtn.style.userSelect = 'none';
    
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
      removeBtn.style.opacity = '1';
      removeBtn.style.pointerEvents = 'auto';
    }
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeImage(index);
    });
    outerContainer.appendChild(removeBtn);
    
    // 添加内层容器到外层容器
    outerContainer.appendChild(innerContainer);
    
    // 添加拖拽事件到外层容器
    outerContainer.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
    outerContainer.addEventListener('dragover', (e) => this.handleDragOverImage(e));
    outerContainer.addEventListener('dragleave', (e) => this.handleDragLeaveImage(e));
    outerContainer.addEventListener('drop', (e) => this.handleDropImage(e, index));

    // R0：触控/手写笔排序（HTML5 drag 仅鼠标可用；鼠标路径保持不变）
    this.bindTouchReorder(outerContainer, index);
    
    // 添加点击事件（选择图片）
    outerContainer.addEventListener('click', () => {
      this.selectImage(index);
    });
    
    // 添加悬停事件，控制删除按钮显示
    outerContainer.addEventListener('mouseenter', () => {
      removeBtn.style.opacity = '1';
      removeBtn.style.transform = 'scale(1.05)';
      removeBtn.style.pointerEvents = 'auto';
    });
    
    outerContainer.addEventListener('mouseleave', () => {
      removeBtn.style.opacity = '0';
      removeBtn.style.transform = 'scale(1)';
      removeBtn.style.pointerEvents = 'none';
    });
    
    // 添加图片操作菜单（如果激活了滤镜工具）
    if (this.activeTool === 'filter') {
      const menuBtn = document.createElement('button');
      menuBtn.className = 'image-menu-btn';
      menuBtn.innerHTML = '⋯';
      menuBtn.title = 'Image options';
      menuBtn.style.position = 'absolute';
      menuBtn.style.top = '0.5rem';
      menuBtn.style.right = '2rem';
      menuBtn.style.width = '1.5rem';
      menuBtn.style.height = '1.5rem';
      menuBtn.style.background = 'var(--mc-overlay-control-bg)';
      menuBtn.style.border = 'none';
      menuBtn.style.borderRadius = '50%';
      menuBtn.style.fontSize = '0.75rem';
      menuBtn.style.cursor = 'pointer';
      menuBtn.style.opacity = '0';
      menuBtn.style.transition = 'opacity 0.2s ease';
      outerContainer.appendChild(menuBtn);
      
      // 悬停时显示菜单按钮
      outerContainer.addEventListener('mouseenter', () => {
        menuBtn.style.opacity = '1';
      });
      
      outerContainer.addEventListener('mouseleave', () => {
        menuBtn.style.opacity = '0';
      });
    }
    
    return outerContainer;
  }

  /**
   * 选择图片
   */
  selectImage(index) {
    this.selectedImageIndex = index;
    
    // 如果当前激活的是滤镜工具，更新滤镜面板
    if (this.activeTool === 'filter') {
      const image = this.images[index];
      this.currentFilter = image.filter;
      
      // 更新滤镜按钮状态
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelector(`[data-filter="${image.filter}"]`).classList.add('active');
    }
    
    this.renderCollage();
  }

  /**
   * 创建添加图片按钮
   */
  createAddImageButton() {
    // 创建外层容器，使用不同的类名区分
    const outerContainer = document.createElement('div');
    outerContainer.className = 'add-image-outer-container';
    outerContainer.style.position = 'relative';
    outerContainer.style.display = 'inline-block';
    
    // 创建内层容器
    // R0：占位色/悬停色改由 components.css §18（深色玻璃 + dashed 品牌绿）接管，
    //     这里只保留尺寸/圆角等布局样式。
    const innerContainer = document.createElement('div');
    innerContainer.className = 'image-inner-container';
    innerContainer.style.position = 'relative';
    innerContainer.style.overflow = 'hidden';
    innerContainer.style.borderRadius = `var(--radius, 0px)`;
    innerContainer.style.minHeight = '0';
    
    // 创建添加按钮（颜色/边框/悬停由 .add-image-btn 组件样式接管）
    const btn = document.createElement('button');
    btn.className = 'add-image-btn';
    btn.innerHTML = '+';
    const addImageLabel = mcI18n('app.add_image_title', {}, 'Add image');
    btn.title = addImageLabel;
    btn.setAttribute('aria-label', addImageLabel);
    btn.style.width = '100%';
    btn.style.height = '100%';
    btn.style.fontSize = '2rem';
    btn.style.cursor = 'pointer';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.transition = 'all 0.2s ease';
    
    btn.addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
    
    innerContainer.appendChild(btn);
    outerContainer.appendChild(innerContainer);
    
    return outerContainer;
  }

  /**
   * 处理图片拖拽开始
   */
  handleDragStart(e, index) {
    this.isDragging = true;
    this.dragStartIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    
    // 获取实际的图片容器元素
    const container = e.currentTarget;
    container.style.opacity = '0.5';
    container.style.transform = 'scale(0.95)';
    container.style.transition = 'all 0.2s ease';
    container.style.zIndex = '1000';
    
    // 创建拖拽图像
    if (e.dataTransfer.setDragImage) {
      const img = container.querySelector('img');
      if (img) {
        e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
      }
    }
  }

  /**
   * 处理图片拖拽悬停
   */
  handleDragOverImage(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // 添加悬停样式，提供清晰的视觉反馈
    const container = e.currentTarget;
    container.style.boxShadow = '0 0 0 2px var(--mc-color-focus)';
    container.style.transform = 'scale(1.05)';
    container.style.transition = 'all 0.2s ease';
  }

  /**
   * 处理图片拖拽离开
   */
  handleDragLeaveImage(e) {
    e.preventDefault();
    
    // 移除悬停样式
    const container = e.currentTarget;
    container.style.boxShadow = 'none';
    container.style.transform = 'scale(1)';
  }

  /**
   * 处理图片拖拽放置
   */
  handleDropImage(e, dropIndex) {
    e.preventDefault();
    
    // 移除所有悬停样式
    document.querySelectorAll('.image-outer-container').forEach(container => {
      container.style.boxShadow = 'none';
      container.style.transform = 'scale(1)';
      container.style.opacity = '1';
    });
    
    if (this.isDragging && this.dragStartIndex !== -1) {
      // 计算实际的放置索引，确保在有效范围内
      const actualDropIndex = Math.min(dropIndex, this.images.length - 1);
      if (this.dragStartIndex !== actualDropIndex) {
        this.reorderImages(this.dragStartIndex, actualDropIndex);
      }
      
      this.isDragging = false;
      this.dragStartIndex = -1;
    }
  }

  /**
   * 重新排序图片
   */
  reorderImages(fromIndex, toIndex) {
    // 确保目标索引在有效范围内
    toIndex = Math.min(toIndex, this.images.length - 1);
    
    if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
      const [movedImage] = this.images.splice(fromIndex, 1);
      this.images.splice(toIndex, 0, movedImage);
      this.renderCollage();
    }
  }

  /**
   * R0：触控/手写笔拖拽排序（P1-6）。
   * - 鼠标路径保持 HTML5 drag 不变（functional 回归依赖）；
   * - 触控/笔：长按 250ms 启动 → setPointerCapture → 半透明 ghost →
   *   elementFromPoint 找目标格 → 释放复用 reorderImages()；
   * - .drag-handle 已设 touch-action:none，保证从手柄起手时手势不被页面滚动抢占；
   * - 中途滚动/取消会清理状态，不产生重排。
   */
  bindTouchReorder(container, index) {
    const LONG_PRESS_MS = 250;
    let pressTimer = null;
    let state = null;

    const clearPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const resetVisual = () => {
      container.classList.remove('touch-reorder-active');
      container.style.opacity = '';
      container.style.transform = '';
      container.style.zIndex = '';
      document.querySelectorAll('.image-outer-container.touch-reorder-target').forEach((node) => {
        node.classList.remove('touch-reorder-target');
      });
    };

    const finish = (event) => {
      clearPress();
      if (!state) return;
      const { pointerId, fromIndex, targetIndex } = state;
      state = null;
      resetVisual();
      try {
        if (event && container.hasPointerCapture && container.hasPointerCapture(pointerId)) {
          container.releasePointerCapture(pointerId);
        }
      } catch (error) {
        console.error('[MeCollage] releasePointerCapture 失败：', error);
      }
      if (fromIndex !== targetIndex && targetIndex >= 0) {
        this.reorderImages(fromIndex, targetIndex);
        this.markDirty();
      }
    };

    container.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      if (event.target.closest('.remove-btn')) return;
      if (event.button !== undefined && event.button !== 0) return;
      clearPress();
      const pointerId = event.pointerId;
      pressTimer = setTimeout(() => {
        pressTimer = null;
        state = { pointerId, fromIndex: index, targetIndex: index };
        try {
          container.setPointerCapture(pointerId);
        } catch (error) {
          console.error('[MeCollage] setPointerCapture 失败：', error);
        }
        container.classList.add('touch-reorder-active');
        container.style.opacity = '0.6';
        container.style.transform = 'scale(1.02)';
        container.style.zIndex = '1000';
        if (navigator.vibrate) {
          try { navigator.vibrate(10); } catch (error) { /* 忽略震动失败 */ }
        }
      }, LONG_PRESS_MS);
    });

    container.addEventListener('pointermove', (event) => {
      if (!state || event.pointerId !== state.pointerId) {
        // 长按未完成就移动 = 用户在滚动页面，取消长按
        if (pressTimer) clearPress();
        return;
      }
      event.preventDefault();
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const target = hit ? hit.closest('.image-outer-container') : null;
      if (!target) return;
      const containers = Array.from(document.querySelectorAll('#collageGrid .image-outer-container'));
      const targetIndex = containers.indexOf(target);
      if (targetIndex === -1) return;
      state.targetIndex = targetIndex;
      containers.forEach((node, i) => {
        node.classList.toggle('touch-reorder-target', i === targetIndex && i !== state.fromIndex);
      });
    });

    container.addEventListener('pointerup', finish);
    container.addEventListener('pointercancel', finish);
    container.addEventListener('pointerleave', () => { if (!state) clearPress(); });
  }

  /**
   * 删除图片
   */
  removeImage(index) {
    this.images.splice(index, 1);
    this.updateImageCount();
    this.renderCollage();
    this.markDirty();
    
    // 如果没有图片了，恢复到初始状态
    if (this.images.length === 0) {
      this._unsavedChanges = false;
      const uploadScreen = document.getElementById('uploadScreen');
      const collageCanvas = document.getElementById('collageCanvas');
      const sidebar = document.querySelector('.sidebar');
      const bottomToolbar = document.querySelector('.bottom-toolbar');
      const exportBtn = document.getElementById('exportBtn');
      
      // 显示上传界面
      uploadScreen.style.display = 'block';
      
      // 隐藏画布区域
      collageCanvas.style.display = 'none';
      
      // 隐藏侧边栏
      if (sidebar) {
        sidebar.style.display = 'none';
      }
      
      // 隐藏底部工具栏
      if (bottomToolbar) {
        bottomToolbar.style.display = 'none';
      }
      
      // 隐藏导出按钮
      if (exportBtn) {
        exportBtn.style.display = 'none';
      }
      
      // 隐藏侧边栏功能区
      this.hideSidebarSections();
    }
  }

  /**
   * 激活工具
   */
  activateTool(toolName) {
    this.activeTool = toolName;
    
    // 更新按钮状态
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const toolBtn = document.getElementById(`${toolName}Btn`);
    if (toolBtn) {
      toolBtn.classList.add('active');
    }
    
    // 显示/隐藏对应侧边栏内容
    this.toggleSidebarSections(toolName);
    
    // 根据工具类型更新交互
    this.updateToolInteraction(toolName);
  }

  /**
   * 切换侧边栏内容
   */
  toggleSidebarSections(toolName) {
    // 隐藏所有侧边栏内容
    document.getElementById('layoutSection').style.display = 'none';
    document.getElementById('filterSection').style.display = 'none';
    document.getElementById('textSection').style.display = 'none';
    document.getElementById('stickerSection').style.display = 'none';
    document.getElementById('aiSection').style.display = 'none';
    
    // 显示当前工具对应的内容
    switch (toolName) {
      case 'layout':
        document.getElementById('layoutSection').style.display = 'block';
        break;
      case 'filter':
        document.getElementById('filterSection').style.display = 'block';
        break;
      case 'text':
        document.getElementById('textSection').style.display = 'block';
        break;
      case 'sticker':
        document.getElementById('stickerSection').style.display = 'block';
        this.bindStickerEvents();
        break;
      case 'ai':
        document.getElementById('aiSection').style.display = 'block';
        break;
    }
  }

  /**
   * 更新工具交互
   */
  updateToolInteraction(toolName) {
    // 根据工具类型更新图片容器的交互
    const imageContainers = document.querySelectorAll('.image-container');
    
    imageContainers.forEach((container, index) => {
      // 移除所有工具相关的交互类
      container.classList.remove('selectable', 'editable');
      
      // 添加当前工具的交互类
      if (toolName === 'filter') {
        container.classList.add('selectable');
      }
      // 其他工具的交互逻辑可以在这里添加
    });
    
    // 渲染拼图画布以应用新的交互状态
    this.renderCollage();
  }

  /**
   * 应用滤镜
   */
  applyFilter(filterName) {
    this.currentFilter = filterName;
    
    // 更新滤镜按钮状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filterName}"]`).classList.add('active');
    
    // 应用滤镜到所有图片
    if (this.images.length > 0) {
      this.images.forEach(image => {
        image.filter = filterName;
      });
    }
    
    this.renderCollage();
    this.markDirty();
  }

  /**
   * 获取滤镜样式
   */
  getFilterStyle(filterName) {
    switch (filterName) {
      case 'noir':
        return 'grayscale(100%) contrast(120%)';
      case 'retro':
        return 'sepia(80%) contrast(90%) saturate(120%)';
      case 'fade':
        return 'brightness(110%) contrast(80%) saturate(70%)';
      case 'glow':
        return 'brightness(120%) contrast(100%) saturate(130%)';
      case 'cool':
        return 'hue-rotate(180deg) saturate(120%)';
      case 'none':
      default:
        return 'none';
    }
  }

  /**
   * 添加文字图层
   */
  addTextLayer() {
    this.saveState();
    // 计算新文本的位置，避免重叠
    let x, y;
    if (this.textLayers.length === 0) {
      // 第一个文本放在中央
      x = 0.5;
      y = 0.5;
    } else {
      // 后续文本放在不同位置，避免完全重叠
      const offset = 0.15;
      const baseIndex = this.textLayers.length % 4;
      switch (baseIndex) {
        case 0:
          x = 0.2;
          y = 0.3;
          break;
        case 1:
          x = 0.8;
          y = 0.3;
          break;
        case 2:
          x = 0.2;
          y = 0.7;
          break;
        case 3:
          x = 0.8;
          y = 0.7;
          break;
      }
    }
    
    const textLayer = {
      id: `text-${Date.now()}`,
      content: window.i18n.t('app.double_click_edit'),
      x: x,
      y: y,
      fontSize: 24,
      color: '#000000',
      fontWeight: 'bold'
    };
    
    this.textLayers.push(textLayer);
    this.renderCollage();
  }

  /**
   * 绑定贴纸事件
   */
  bindStickerEvents() {
    // 只绑定一次，避免每次切到贴纸工具都重复叠加监听器
    if (this._stickerEventsBound) return;
    this._stickerEventsBound = true;
    const stickerBtns = document.querySelectorAll('.sticker-btn');
    stickerBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sticker = e.target.dataset.sticker;
        this.addStickerLayer(sticker);
      });
    });
  }
  
  /**
   * 添加贴纸图层
   */
  addStickerLayer(sticker) {
    this.saveState();
    const stickerLayer = {
      id: `sticker-${Date.now()}`,
      content: sticker,
      x: 0.5, // 相对位置，0-1
      y: 0.5,
      fontSize: 48
    };
    
    this.stickerLayers.push(stickerLayer);
    this.renderCollage();
  }
  
  /**
   * 渲染文字图层
   */
  renderTextLayers() {
    const collageCanvas = document.getElementById('collageCanvas');
    const collageGrid = document.getElementById('collageGrid');
    
    // 移除现有文字图层容器（只删 .text-layer 会残留 .text-wrapper，导致坐标/事件读到旧节点）
    collageCanvas.querySelectorAll('.text-layers-container').forEach(container => container.remove());
    
    // 获取网格的实际位置和尺寸
    const gridRect = collageGrid.getBoundingClientRect();
    const canvasRect = collageCanvas.getBoundingClientRect();
    const gridLeft = gridRect.left - canvasRect.left;
    const gridTop = gridRect.top - canvasRect.top;
    
    // 创建文字图层容器
    const textContainer = document.createElement('div');
    textContainer.className = 'text-layers-container';
    textContainer.style.position = 'absolute';
    textContainer.style.top = '0';
    textContainer.style.left = '0';
    textContainer.style.width = '100%';
    textContainer.style.height = '100%';
    textContainer.style.pointerEvents = 'none';
    
    // 渲染每个文字图层
    this.textLayers.forEach(layer => {
      const textWrapper = document.createElement('div');
      textWrapper.className = 'text-wrapper';
      textWrapper.style.position = 'absolute';
      // 基于collageGrid的实际位置计算文字位置
      textWrapper.style.left = `${gridLeft + (layer.x * gridRect.width)}px`;
      textWrapper.style.top = `${gridTop + (layer.y * gridRect.height)}px`;
      textWrapper.style.transform = 'translate(-50%, -50%)';
      textWrapper.style.pointerEvents = 'all';
      textWrapper.style.cursor = 'move';
      textWrapper.style.zIndex = '10';
      textWrapper.style.display = 'inline-block';
      
      // 创建删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'text-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.style.cssText = `
        position: absolute;
        top: -15px;
        right: -15px;
        width: 24px;
        height: 24px;
        background-color: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 11;
        pointer-events: all;
      `;
      
      if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
        deleteBtn.style.opacity = '1';
      }
      // 删除按钮事件
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTextLayer(layer.id);
      });
      
      // 文本元素
      const textElement = document.createElement('div');
      textElement.className = 'text-layer';
      textElement.dataset.id = layer.id;
      textElement.textContent = layer.content;
      textElement.style.position = 'relative';
      textElement.style.fontSize = `${layer.fontSize}px`;
      textElement.style.color = layer.color;
      textElement.style.fontWeight = layer.fontWeight;
      textElement.style.userSelect = 'none';
      textElement.style.margin = '10px';
      
      // 双击编辑事件
      textElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.editTextLayer(layer.id);
      });
      
      // 鼠标悬停显示删除按钮
      textWrapper.addEventListener('mouseenter', () => {
        deleteBtn.style.opacity = '1';
      });
      
      textWrapper.addEventListener('mouseleave', () => {
        deleteBtn.style.opacity = '0';
      });
      
      // 添加拖拽功能 - Pointer Events（鼠标 + 触屏 + 触控笔）
      textWrapper.style.touchAction = 'none';
      textWrapper.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.pointerType === 'touch' && e.isPrimary === false) return;
        if (e.target && e.target.closest && e.target.closest('.text-delete-btn')) return;
        e.stopPropagation();

        // 开始拖拽，传递指针事件（clientX/Y 与鼠标事件一致）
        this.startDrag(textWrapper, layer, 'text', e);
        if (textWrapper.setPointerCapture) {
          try { textWrapper.setPointerCapture(e.pointerId); } catch (error) { /* 忽略不支持的环境 */ }
        }
      });
      
      // 组装元素
      textWrapper.appendChild(deleteBtn);
      textWrapper.appendChild(textElement);
      textContainer.appendChild(textWrapper);
    });
    
    collageCanvas.appendChild(textContainer);
  }
  
  /**
   * 渲染贴纸图层
   */
  renderStickerLayers() {
    const collageCanvas = document.getElementById('collageCanvas');
    const collageGrid = document.getElementById('collageGrid');
    
    // 移除现有贴纸图层容器（避免残留旧 wrapper）
    collageCanvas.querySelectorAll('.sticker-layers-container').forEach(container => container.remove());
    
    // 获取网格的实际位置和尺寸
    const gridRect = collageGrid.getBoundingClientRect();
    const canvasRect = collageCanvas.getBoundingClientRect();
    const gridLeft = gridRect.left - canvasRect.left;
    const gridTop = gridRect.top - canvasRect.top;
    
    // 创建贴纸图层容器
    const stickerContainer = document.createElement('div');
    stickerContainer.className = 'sticker-layers-container';
    stickerContainer.style.position = 'absolute';
    stickerContainer.style.top = '0';
    stickerContainer.style.left = '0';
    stickerContainer.style.width = '100%';
    stickerContainer.style.height = '100%';
    stickerContainer.style.pointerEvents = 'none';
    
    // 渲染每个贴纸图层
    this.stickerLayers.forEach(layer => {
      const stickerElement = document.createElement('div');
      stickerElement.className = 'sticker-layer';
      stickerElement.dataset.id = layer.id;
      stickerElement.textContent = layer.content;
      stickerElement.style.position = 'absolute';
      // 基于collageGrid的实际位置计算贴纸位置
      stickerElement.style.left = `${gridLeft + (layer.x * gridRect.width)}px`;
      stickerElement.style.top = `${gridTop + (layer.y * gridRect.height)}px`;
      stickerElement.style.transform = 'translate(-50%, -50%)';
      stickerElement.style.fontSize = `${layer.fontSize}px`;
      stickerElement.style.pointerEvents = 'all';
      stickerElement.style.cursor = 'move';
      
      // 添加拖拽功能 - Pointer Events（鼠标 + 触屏 + 触控笔）
      stickerElement.style.touchAction = 'none';
      stickerElement.style.userSelect = 'none';
      stickerElement.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.pointerType === 'touch' && e.isPrimary === false) return;
        if (e.target && e.target.closest && e.target.closest('.sticker-delete-btn')) return;
        e.stopPropagation();

        // 开始拖拽，传递指针事件
        this.startDrag(stickerElement, layer, 'sticker', e);
        if (stickerElement.setPointerCapture) {
          try { stickerElement.setPointerCapture(e.pointerId); } catch (error) { /* 忽略不支持的环境 */ }
        }
      });
      
      stickerContainer.appendChild(stickerElement);

      // 删除按钮（挂在容器上，不放进 stickerElement，避免污染贴纸文本内容）
      const delBtn = document.createElement('button');
      delBtn.className = 'sticker-delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.style.cssText = `position:absolute;left:${gridLeft + layer.x * gridRect.width + 18}px;top:${gridTop + layer.y * gridRect.height - 18}px;width:22px;height:22px;background:#ef4444;color:#fff;border:none;border-radius:50%;font-size:14px;font-weight:bold;cursor:pointer;opacity:0;transition:opacity .2s;display:flex;align-items:center;justify-content:center;z-index:12;pointer-events:auto;`;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeStickerLayer(layer.id);
      });
      if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
        delBtn.style.opacity = '1';
      }
      stickerElement.addEventListener('mouseenter', () => { delBtn.style.opacity = '1'; });
      stickerElement.addEventListener('mouseleave', () => { delBtn.style.opacity = '0'; });
      stickerContainer.appendChild(delBtn);
    });
    
    collageCanvas.appendChild(stickerContainer);
  }

  /**
   * 删除文字图层
   */
  removeTextLayer(layerId) {
    const layerIndex = this.textLayers.findIndex(l => l.id === layerId);
    if (layerIndex !== -1) {
      this.saveState();
      this.textLayers.splice(layerIndex, 1);
      this.renderCollage();
    }
  }

  removeStickerLayer(layerId) {
    const layerIndex = this.stickerLayers.findIndex(l => l.id === layerId);
    if (layerIndex !== -1) {
      this.saveState();
      this.stickerLayers.splice(layerIndex, 1);
      this.renderCollage();
    }
  }
  
  /**
   * 编辑文字图层
   */
  editTextLayer(layerId) {
    const layer = this.textLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // 预设颜色选项
    const presetColors = [
      '#000000', // 黑色
      '#ef4444', // 红色
      '#3b82f6', // 蓝色
      '#22c55e', // 绿色
      '#eab308', // 黄色
      '#a855f7', // 紫色
      '#f97316', // 橙色
      '#64748b'  // 灰色
    ];
    
    // 使用更友好的自定义对话框替代prompt
    const dialog = document.createElement('div');
    dialog.className = 'text-edit-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    `;
    
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = `
      background-color: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      animation: slideUp 0.3s ease;
    `;
    
    const title = document.createElement('h3');
    title.textContent = window.i18n.t('dialog.edit_text_title');
    title.style.cssText = `
      margin: 0 0 1rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--mc-slate-500);
    `;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = layer.content;
    input.style.cssText = `
      width: 100%;
      padding: 0.75rem;
      font-size: 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      box-sizing: border-box;
    `;
    
    // 颜色选择部分
    const colorSection = document.createElement('div');
    colorSection.style.cssText = `
      margin-bottom: 1.5rem;
    `;
    
    const colorLabel = document.createElement('label');
    colorLabel.textContent = window.i18n.t('dialog.text_color_label');
    colorLabel.style.cssText = `
      display: block;
      margin-bottom: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #64748b;
    `;
    
    const colorGrid = document.createElement('div');
    colorGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 0.5rem;
    `;
    
    presetColors.forEach(color => {
      const colorBtn = document.createElement('button');
      colorBtn.style.cssText = `
        width: 100%;
        padding: 0.5rem;
        background-color: ${color};
        border: 2px solid ${layer.color === color ? 'var(--mc-color-action)' : 'var(--mc-border-input)'};
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
        aspect-ratio: 1;
      `;
      colorBtn.title = color;
      
      // 点击事件
      colorBtn.addEventListener('click', () => {
        layer.color = color;
        // 更新所有颜色按钮的边框
        colorGrid.querySelectorAll('button').forEach(btn => {
          btn.style.border = `2px solid ${btn.title === color ? 'var(--mc-color-action)' : 'var(--mc-border-input)'}`;
        });
        this.renderCollage();
      });
      
      colorGrid.appendChild(colorBtn);
    });
    
    colorSection.appendChild(colorLabel);
    colorSection.appendChild(colorGrid);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = `
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 0.5rem 1rem;
      background-color: #f1f5f9;
      color: #64748b;
      border: none;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = window.i18n.t('dialog.ok');
    confirmBtn.style.cssText = `
      padding: 0.5rem 1rem;
      background-color: var(--mc-color-action);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    // 事件处理
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    confirmBtn.addEventListener('click', () => {
      layer.content = input.value;
      this.renderCollage();
      this.markDirty();
      document.body.removeChild(dialog);
    });
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });
    
    // 点击对话框外部关闭
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        cancelBtn.click();
      }
    });
    
    // 组装对话框
    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(confirmBtn);
    
    dialogContent.appendChild(title);
    dialogContent.appendChild(input);
    dialogContent.appendChild(colorSection);
    dialogContent.appendChild(buttonGroup);
    
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    
    // 自动聚焦输入框
    input.focus();
    input.select();
  }

  /**
   * 导出拼图
   * R0（P1-4）：开始时禁用按钮 + aria-busy + progress toast；成功给「已导出 + 尺寸/大小」，
   * 失败给可重试 toast；无论成败恢复按钮。**导出结果（白底/scale 2/quality 1.0）保持不变。**
   */
  async exportCollage() {
    if (this.isExporting) return;
    const collageCanvas = document.getElementById('collageCanvas');
    const collageGrid = document.getElementById('collageGrid');
    const exportBtn = document.getElementById('exportBtn');
    if (!collageGrid || !collageCanvas) {
      this.showErrorToast('error.canvas_not_found', {}, 'Canvas not found');
      return;
    }

    this.isExporting = true;
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.setAttribute('aria-busy', 'true');
    }
    const restoreExportButton = () => {
      this.isExporting = false;
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.removeAttribute('aria-busy');
      }
    };
    const retry = () => { this.exportCollage(); };

    mcToast(mcI18n('export.progress', {}, 'Rendering collage…'), { type: 'info', duration: 3200 });

    let cleanup = () => {};
    try {
      // html2canvas 正常是静态 <script> 引入；若被拦截/未加载，按懒加载约定再试一次
      if (typeof html2canvas === 'undefined') {
        await this.ensureLibs(['html2canvas']);
      }
      if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas is not available');
      }

      const gridRect = collageGrid.getBoundingClientRect();
      if (!gridRect.width || !gridRect.height) {
        throw new Error('collage grid has no measurable size');
      }

      // Christmas 模式：可按固定像素尺寸导出；默认编辑器保持原有“视口 CSS 尺寸 × 2”
      const usesXmasExport = this.isChristmasMode && this.exportTarget;
      const outWidth = usesXmasExport ? this.exportTarget.width : gridRect.width;
      const outHeight = usesXmasExport ? this.exportTarget.height : gridRect.height;
      const outputScale = outWidth / gridRect.width;
      const exportFormat = this.isChristmasMode ? this.exportFormat : 'png';
      const exportBackground = this.isChristmasMode ? this._getChristmasCanvasColor() : '#ffffff';

      // 只捕获确定尺寸的离屏容器，避免 padding/border-box 导致裁切与比例错误
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `position:fixed;left:0;top:0;width:${outWidth}px;height:${outHeight}px;background:${exportBackground};overflow:hidden;z-index:-1;pointer-events:none;`;
      if (usesXmasExport) {
        // 固定尺寸导出时按比例放大间距/圆角，保持与预览一致的观感
        wrapper.style.setProperty('--gutter', `${this.gutter * outputScale}px`);
        wrapper.style.setProperty('--radius', `${this.radius * outputScale}px`);
      }

      const gridClone = collageGrid.cloneNode(true);
      gridClone.style.width = '100%';
      gridClone.style.height = '100%';
      gridClone.style.margin = '0';
      gridClone.style.maxHeight = 'none';
      gridClone.querySelectorAll('.add-image-outer-container, .add-image-btn, .remove-btn, .drag-handle, .image-menu-btn, .text-delete-btn, .sticker-delete-btn').forEach(el => el.remove());
      wrapper.appendChild(gridClone);

      // 文字图层（位置与预览一致：相对网格左上角，x/y 为 0-1 比例）
      this.textLayers.forEach(layer => {
        const el = document.createElement('div');
        el.className = 'text-layer';
        el.textContent = layer.content;
        el.style.cssText = `position:absolute;left:${layer.x * outWidth}px;top:${layer.y * outHeight}px;transform:translate(-50%,-50%);font-size:${layer.fontSize * (usesXmasExport ? outputScale : 1)}px;color:${layer.color};font-weight:${layer.fontWeight};pointer-events:none;white-space:nowrap;z-index:10;`;
        wrapper.appendChild(el);
      });
      // 贴纸图层
      this.stickerLayers.forEach(layer => {
        const el = document.createElement('div');
        el.className = 'sticker-layer';
        el.textContent = layer.content;
        el.style.cssText = `position:absolute;left:${layer.x * outWidth}px;top:${layer.y * outHeight}px;transform:translate(-50%,-50%);font-size:${layer.fontSize * (usesXmasExport ? outputScale : 1)}px;pointer-events:none;white-space:nowrap;z-index:11;`;
        wrapper.appendChild(el);
      });

      document.body.appendChild(wrapper);
      cleanup = () => { if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper); };

      // R0 备注：foreignObjectRendering 会按 html2canvas 的 scrollX/scrollY（默认取当前滚动位置）
      // 计算克隆文档偏移；上传后会自动滚动到画布，若页面已滚动，不传 0 会导出全白画布。
      // 离屏 wrapper 始终 position:fixed 在视口左上角，因此这里固定 scrollX/scrollY = 0。
      // 其余导出参数（白底 / scale 2 / useCORS / allowTaint / foreignObjectRendering）保持不变。
      const renderedCanvas = await html2canvas(wrapper, {
        backgroundColor: exportBackground,
        scale: usesXmasExport ? 1 : 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: true,
        scrollX: 0,
        scrollY: 0
      });
      cleanup();

      const isJpeg = exportFormat === 'jpg';
      const dataUrl = renderedCanvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', isJpeg ? 0.92 : 1.0);
      const link = document.createElement('a');
      link.download = `mecollage-${Date.now()}.${isJpeg ? 'jpg' : 'png'}`;
      link.href = dataUrl;
      link.click();

      // R0：成功后解除未保存保护 + 反馈尺寸与文件大小
      this._unsavedChanges = false;
      const sizeLabel = `${renderedCanvas.width}×${renderedCanvas.height} px · ${mcFormatBytes(mcEstimateDataUrlBytes(dataUrl))}`;
      mcToast(
        mcI18n('toast.export_success', { size: sizeLabel }, `Collage exported · ${sizeLabel}`),
        { type: 'success', duration: 6000 },
      );
    } catch (error) {
      cleanup();
      console.error('Export failed:', error);
      this.showErrorToast(
        'toast.export_failed',
        {},
        'Export failed. Please try again.',
        {
          duration: 8000,
          actionLabel: mcI18n('toast.retry', {}, 'Retry'),
          onAction: retry,
        },
      );
    } finally {
      restoreExportButton();
    }
  }

  /**
   * 设置网格布局模式（自动/自定义）
   */
  setGridLayoutMode(mode) {
    this.useCustomGrid = (mode === 'custom');

    // 更新按钮状态
    document.querySelectorAll('.layout-mode-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

    // 显示/隐藏自定义网格输入框
    const customGridInputs = document.getElementById('customGridInputs');
    if (customGridInputs) {
      customGridInputs.style.display = this.useCustomGrid ? 'block' : 'none';
    }

    // 切到 Custom 时只展开输入框，等用户点 Apply 再应用；切回 Auto 立即恢复自动布局
    if (!this.useCustomGrid && this.images.length > 0) {
      this.renderCollage();
    }
  }

  /**
   * 应用自定义网格设置
   */
  applyCustomGrid() {
    const rowsInput = document.getElementById('gridRowsInput');
    const colsInput = document.getElementById('gridColsInput');

    if (!rowsInput || !colsInput) return;

    const rows = parseInt(rowsInput.value);
    const cols = parseInt(colsInput.value);

    // 验证输入
    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1 || rows > 10 || cols > 10) {
      this.showErrorToast('toast.error.grid_invalid', {}, 'Please enter valid grid dimensions (1-10)');
      return;
    }

    // 验证网格容量（只有还能加图时才需要为“+”预留一格）
    const addNeeded = this.images.length < this.maxImages ? 1 : 0;
    const gridCapacity = rows * cols;
    if (this.images.length + addNeeded > gridCapacity) {
      this.showErrorToast(
        'toast.error.grid_capacity',
        { capacity: gridCapacity - addNeeded, count: this.images.length },
        `Current grid (${rows}×${cols}) can only hold ${gridCapacity - addNeeded} photos. You have ${this.images.length} photos.`,
      );
      return;
    }

    // 应用自定义网格
    this.customGridRows = rows;
    this.customGridCols = cols;
    this.useCustomGrid = true;
    this.markDirty();

    // 重新渲染拼图
    this.renderCollage();
  }

  /**
   * 加载 AI 模型（R1：库按需动态加载，不阻塞首屏）
   */
  async loadAiModels() {
    if (this.isAiModelsLoaded) return true;
    
    try {
      this.isProcessingAi = true;
      this.updateAiBtnState(true);

      // AI 库改为懒加载（原首页静态 <script> 已移除）
      await this.ensureLibs(['ort', 'faceapi']);
      if (typeof faceapi === 'undefined') {
        throw new Error('face-api unavailable');
      }
      
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
      ]);
      
      this.isAiModelsLoaded = true;
      this.isProcessingAi = false;
      this.updateAiBtnState(false);
      return true;
    } catch (error) {
      console.error('Failed to load AI models:', error);
      this.isProcessingAi = false;
      this.updateAiBtnState(false);
      this.showErrorToast(
        'toast.error.ai_models',
        {},
        'Failed to load AI models. Please check your internet connection.',
        {
          duration: 8000,
          actionLabel: mcI18n('toast.retry', {}, 'Retry'),
          onAction: () => { this.applySmartFaceCenter(); },
        },
      );
      return false;
    }
  }

  /**
   * 更新 AI 按钮状态
   */
  updateAiBtnState(processing) {
    const aiFaceCenterBtn = document.getElementById('aiFaceCenterBtn');
    const aiBgRemovalBtn = document.getElementById('aiBgRemovalBtn');
    
    if (aiFaceCenterBtn) {
      aiFaceCenterBtn.disabled = processing;
      aiFaceCenterBtn.textContent = processing
        ? mcI18n('ai.processing', {}, 'Processing…')
        : mcI18n('ai.apply_face_center', {}, 'Apply to All Photos');
    }
    
    if (aiBgRemovalBtn) {
      aiBgRemovalBtn.disabled = processing;
      aiBgRemovalBtn.textContent = processing
        ? mcI18n('ai.processing', {}, 'Processing…')
        : mcI18n('ai.remove_bg', {}, 'Remove Background');
    }
  }

  /**
   * 应用智能人脸居中
   */
  async applySmartFaceCenter() {
    if (this.images.length === 0) return;
    
    const success = await this.loadAiModels();
    if (!success) return;
    
    this.isProcessingAi = true;
    this.updateAiBtnState(true);
    
    let processed = 0;
    let detected = 0;
    try {
      for (let i = 0; i < this.images.length; i++) {
        const image = this.images[i];
        if (image.faceCenter) continue; // 已经处理过的跳过
        
        const img = new Image();
        img.src = image.url;
        try {
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('image decode failed'));
          });
        } catch (e) {
          continue;
        }
        
        const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions());
        processed++;
        if (detections.length > 0) {
          // 找到最大的脸
          const largestFace = detections.reduce((prev, current) => 
            (prev.box.width * prev.box.height > current.box.width * current.box.height) ? prev : current
          );
          
          const centerX = (largestFace.box.x + largestFace.box.width / 2) / img.width * 100;
          const centerY = (largestFace.box.y + largestFace.box.height / 2) / img.height * 100;
          
          image.faceCenter = { x: centerX, y: centerY };
          detected++;
        }
      }
      
      this.renderCollage();
      this.markDirty();
      if (detected === 0) {
        this.showInfoToast('ai.no_face', {}, 'No faces detected in some photos.');
      } else {
        mcToast(mcI18n('ai.face_detected', {}, 'Faces detected and centered!'), { type: 'success' });
      }
    } catch (error) {
      console.error('Face centering failed:', error);
      this.showErrorToast('toast.error.ai_face', {}, 'Face centering failed. Please try again.');
    } finally {
      this.isProcessingAi = false;
      this.updateAiBtnState(false);
    }
  }

  /**
   * 应用本地 AI 抠图
   */
  async applyAiBgRemoval() {
    // 检查是否有选中的图片，如果没有则处理第一张或提示
    let indexToProcess = this.selectedImageIndex;
    if (indexToProcess === -1 && this.images.length > 0) {
      indexToProcess = 0; // 默认处理第一张
    }
    
    if (indexToProcess === -1) {
      this.showErrorToast('toast.error.select_photo', {}, 'Please select a photo first');
      return;
    }
    
    const image = this.images[indexToProcess];
    this.isProcessingAi = true;
    this.updateAiBtnState(true);
    
    try {
      // 动态加载库（如果尚未加载）
      if (typeof window.imglyRemoveBackground !== 'function') {
        console.log('Loading AI Background Removal library from esm.sh...');
        const module = await import('https://esm.sh/@imgly/background-removal@1.4.5');
        window.imglyRemoveBackground = module.default;
      }

      // 使用 @imgly/background-removal，并配置高质量模型
       const config = {
         model: 'medium', // 使用标准模型以获得更好的平衡效果
         output: {
          format: 'image/png',
          quality: 0.9,
          type: 'foreground'
        },
        debug: true
      };

      const blob = await window.imglyRemoveBackground(image.url, config);
      const url = URL.createObjectURL(blob);
      
      // 更新图片
      image.url = url;
      // 清除之前的人脸居中数据，因为图片内容变了
      delete image.faceCenter;
      
      this.renderCollage();
      this.markDirty();
    } catch (error) {
      console.error('Background removal failed:', error);
      this.showErrorToast('toast.error.ai_bg', {}, 'Background removal failed. Please try again.');
    } finally {
      this.isProcessingAi = false;
      this.updateAiBtnState(false);
    }
  }

  /* ==========================================================================
   * Christmas mode（/#christmas 深链）
   * 只做加法：默认编辑器（无 hash）不加载 CSS、不注入 UI、不改导出行为。
   * ======================================================================== */

  setupChristmasMode() {
    if (typeof location === 'undefined' || location.hash !== '#christmas') return;
    this.isChristmasMode = true;
    this.exportFormat = 'png';
    this.exportTarget = { width: 1080, height: 1080 };
    if (document.getElementById('christmasModeScript')) return;
    const script = document.createElement('script');
    script.id = 'christmasModeScript';
    script.src = '/assets/js/christmas-mode.js';
    script.onload = () => {
      if (window.MeCollageChristmas) window.MeCollageChristmas.install(this);
    };
    document.body.appendChild(script);
  }

  _syncChristmasExportUI() {
    if (window.MeCollageChristmas) window.MeCollageChristmas.syncExportUI(this);
  }

  _getChristmasCanvasColor() {
    const canvas = document.getElementById('collageGrid');
    if (!canvas) return '#ffffff';
    const color = window.getComputedStyle(canvas).backgroundColor;
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return '#ffffff';
    return color;
  }

}


