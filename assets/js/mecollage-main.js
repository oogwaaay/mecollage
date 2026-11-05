// MeCollage Pro 主应用程序
// 严格按照交互示意图实现
class MeCollagePro {
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

    this.init();
  }

  /**
   * 初始化应用程序
   */
  init() {
    this.bindEvents();
    this.updateStyles();
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

    // 添加全局鼠标事件监听器，用于拖拽功能
    document.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
    document.addEventListener('mouseup', () => this.handleGlobalMouseUp());
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
      alert(`You can add up to ${this.maxImages} images per collage.`);
      return;
    }
    if (files.length > remainingSlots) {
      alert(`Only ${remainingSlots} more image(s) can be added (max ${this.maxImages}).`);
    }
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onerror = () => {
        alert(`Could not read "${file.name}". Please try another image.`);
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
          this.updateImageCount();
          this.renderCollage();
          this.showCollageCanvas();
        };
        img.onerror = () => {
          // HEIC/损坏文件在多数浏览器无法解码：给出明确反馈，避免“选了文件没反应”
          alert(`Could not decode "${file.name}". Supported formats: PNG, JPG, WEBP.`);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
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
    
    // 更新按钮状态
    document.querySelectorAll('.aspect-ratio-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-ratio="${ratio}"]`).classList.add('active');
    
    this.renderCollage();
  }

  /**
   * 更新CSS变量
   */
  updateStyles() {
    const root = document.documentElement;
    root.style.setProperty('--gutter', `${this.gutter}px`);
    root.style.setProperty('--radius', `${this.radius}px`);
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

    const hasAdd = this.images.length < this.maxImages;

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
    innerContainer.style.backgroundColor = '#f1f5f9';
    
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
    
    // 添加白点
    const dots = document.createElement('div');
    dots.className = 'drag-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    
    dragHandle.appendChild(dots);
    innerContainer.appendChild(dragHandle);
    
    // 添加删除按钮 - 放在外层容器，避免被裁剪
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '🗑️';
    removeBtn.title = 'Remove image';
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '-0.25rem';
    removeBtn.style.right = '-0.25rem';
    removeBtn.style.width = '1.5rem';
    removeBtn.style.height = '1.5rem';
    removeBtn.style.background = 'rgba(255, 255, 255, 0.95)';
    removeBtn.style.color = '#ef4444';
    removeBtn.style.border = 'none';
    removeBtn.style.borderRadius = '50%';
    removeBtn.style.fontSize = '0.75rem';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.display = 'flex';
    removeBtn.style.alignItems = 'center';
    removeBtn.style.justifyContent = 'center';
    removeBtn.style.opacity = '0';
    removeBtn.style.transform = 'translate(0, 0)';
    removeBtn.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    removeBtn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
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
    
    // 添加点击事件（选择图片）
    outerContainer.addEventListener('click', () => {
      this.selectImage(index);
    });
    
    // 添加悬停事件，控制删除按钮显示
    outerContainer.addEventListener('mouseenter', () => {
      removeBtn.style.opacity = '1';
      removeBtn.style.transform = 'scale(1.05)';
      removeBtn.style.boxShadow = '0 3px 12px rgba(0, 0, 0, 0.2)';
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
      menuBtn.style.background = 'rgba(255, 255, 255, 0.9)';
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
    const innerContainer = document.createElement('div');
    innerContainer.className = 'image-inner-container';
    innerContainer.style.position = 'relative';
    innerContainer.style.overflow = 'hidden';
    innerContainer.style.borderRadius = `var(--radius, 0px)`;
    innerContainer.style.minHeight = '0';
    innerContainer.style.backgroundColor = '#f1f5f9';
    
    // 创建添加按钮
    const btn = document.createElement('button');
    btn.className = 'add-image-btn';
    btn.innerHTML = '+';
    btn.title = 'Add image';
    btn.style.width = '100%';
    btn.style.height = '100%';
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.fontSize = '2rem';
    btn.style.color = '#94a3b8';
    btn.style.cursor = 'pointer';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.transition = 'all 0.2s ease';
    
    btn.addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
    
    // 添加悬停效果
    innerContainer.addEventListener('mouseenter', () => {
      btn.style.color = '#64748b';
      innerContainer.style.background = '#e2e8f0';
    });
    
    innerContainer.addEventListener('mouseleave', () => {
      btn.style.color = '#94a3b8';
      innerContainer.style.background = '#f1f5f9';
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
    container.style.boxShadow = '0 0 0 2px #3b82f6';
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
   * 删除图片
   */
  removeImage(index) {
    this.images.splice(index, 1);
    this.updateImageCount();
    this.renderCollage();
    
    // 如果没有图片了，恢复到初始状态
    if (this.images.length === 0) {
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
      
      // 添加拖拽功能 - 使用全局拖拽事件
      textWrapper.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        
        // 开始拖拽，传递鼠标事件
        this.startDrag(textWrapper, layer, 'text', e);
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
      
      // 添加拖拽功能 - 使用全局拖拽事件
      stickerElement.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        
        // 开始拖拽，传递鼠标事件
        this.startDrag(stickerElement, layer, 'sticker', e);
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
      color: #1e293b;
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
        border: 2px solid ${layer.color === color ? '#3b82f6' : '#e2e8f0'};
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
          btn.style.border = `2px solid ${btn.title === color ? '#3b82f6' : '#e2e8f0'}`;
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
      background-color: #3b82f6;
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
   */
  exportCollage() {
    const collageCanvas = document.getElementById('collageCanvas');
    const collageGrid = document.getElementById('collageGrid');
    if (!collageGrid || !collageCanvas) {
      alert(window.i18n ? window.i18n.t('error.canvas_not_found') : 'Canvas not found');
      return;
    }
    if (typeof html2canvas === 'undefined') {
      alert('Export feature requires html2canvas library');
      return;
    }

    const gridRect = collageGrid.getBoundingClientRect();
    if (!gridRect.width || !gridRect.height) return;

    // 只捕获确定尺寸的离屏容器，避免 padding/border-box 导致裁切与比例错误
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:fixed;left:0;top:0;width:${gridRect.width}px;height:${gridRect.height}px;background:#ffffff;overflow:hidden;z-index:-1;pointer-events:none;`;

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
      el.style.cssText = `position:absolute;left:${layer.x * gridRect.width}px;top:${layer.y * gridRect.height}px;transform:translate(-50%,-50%);font-size:${layer.fontSize}px;color:${layer.color};font-weight:${layer.fontWeight};pointer-events:none;white-space:nowrap;z-index:10;`;
      wrapper.appendChild(el);
    });
    // 贴纸图层
    this.stickerLayers.forEach(layer => {
      const el = document.createElement('div');
      el.className = 'sticker-layer';
      el.textContent = layer.content;
      el.style.cssText = `position:absolute;left:${layer.x * gridRect.width}px;top:${layer.y * gridRect.height}px;transform:translate(-50%,-50%);font-size:${layer.fontSize}px;pointer-events:none;white-space:nowrap;z-index:11;`;
      wrapper.appendChild(el);
    });

    document.body.appendChild(wrapper);
    const cleanup = () => { if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper); };

    html2canvas(wrapper, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      foreignObjectRendering: true
    }).then(canvas => {
      cleanup();
      const link = document.createElement('a');
      link.download = `mecollage-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    }).catch(error => {
      cleanup();
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    });
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
      alert('Please enter valid grid dimensions (1-10)');
      return;
    }

    // 验证网格容量（只有还能加图时才需要为“+”预留一格）
    const addNeeded = this.images.length < this.maxImages ? 1 : 0;
    const gridCapacity = rows * cols;
    if (this.images.length + addNeeded > gridCapacity) {
      alert(`Current grid (${rows}×${cols}) can only hold ${gridCapacity - addNeeded} photos. You have ${this.images.length} photos.`);
      return;
    }

    // 应用自定义网格
    this.customGridRows = rows;
    this.customGridCols = cols;
    this.useCustomGrid = true;

    // 重新渲染拼图
    this.renderCollage();
  }

  /**
   * 加载 AI 模型
   */
  async loadAiModels() {
    if (this.isAiModelsLoaded) return true;
    
    try {
      this.isProcessingAi = true;
      this.updateAiBtnState(true);
      
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
      alert('Failed to load AI models. Please check your internet connection.');
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
      aiFaceCenterBtn.textContent = processing ? window.i18n.t('ai.processing') : window.i18n.t('ai.apply_face_center');
    }
    
    if (aiBgRemovalBtn) {
      aiBgRemovalBtn.disabled = processing;
      aiBgRemovalBtn.textContent = processing ? window.i18n.t('ai.processing') : window.i18n.t('ai.remove_bg');
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
      if (detected === 0) {
        alert(window.i18n ? window.i18n.t('ai.no_face') : 'No faces detected in some photos.');
      } else {
        alert(window.i18n ? window.i18n.t('ai.face_detected') : 'Faces detected and centered!');
      }
    } catch (error) {
      console.error('Face centering failed:', error);
      alert('Face centering failed. Please try again.');
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
      alert('Please select a photo first');
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
    } catch (error) {
      console.error('Background removal failed:', error);
      alert('Background removal failed. Please try again.');
    } finally {
      this.isProcessingAi = false;
      this.updateAiBtnState(false);
    }
  }
}


