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
    const filesToProcess = files.slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
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
    // 考虑添加图片按钮，需要为其预留位置
    const imageCount = this.images.length;
    const totalItems = imageCount + 1; // +1 是添加图片按钮
    
    if (totalItems === 0) return { rows: 1, cols: 1 };
    
    // 根据纵横比和总项目数（图片+添加按钮）计算最佳网格
    const aspectRatio = this.currentAspectRatio.split(':').map(Number);
    const ratio = aspectRatio[0] / aspectRatio[1];
    
    // 网格计算逻辑，确保添加图片按钮始终有位置
    let cols, rows;
    
    if (totalItems === 1) {
      // 只有添加按钮
      cols = 1;
      rows = 1;
    } else if (totalItems === 2) {
      // 1张图片 + 1个添加按钮
      // 对于1张图片，让它占据整个画布空间，按照所选比例显示
      cols = 1;
      rows = 1;
    } else if (totalItems === 3) {
      // 2张图片 + 1个添加按钮
      // 根据纵横比调整布局
      if (ratio >= 1) {
        // 横向或正方形比例，2列1行
        cols = 2;
        rows = 1;
      } else {
        // 纵向比例，1列2行
        cols = 1;
        rows = 2;
      }
    } else if (totalItems === 4) {
      // 3张图片 + 1个添加按钮
      // 根据纵横比调整布局
      if (ratio > 1) {
        // 横向比例，3列1行，添加按钮在第4个位置
        cols = 4;
        rows = 1;
      } else {
        // 纵向或正方形比例，2列2行
        cols = 2;
        rows = 2;
      }
    } else if (totalItems === 5) {
      // 4张图片 + 1个添加按钮
      // 根据纵横比调整布局
      if (ratio > 1.5) {
        // 宽屏比例，5列1行
        cols = 5;
        rows = 1;
      } else if (ratio > 1) {
        // 横向比例，3列2行
        cols = 3;
        rows = 2;
      } else {
        // 纵向或正方形比例，2列3行
        cols = 2;
        rows = 3;
      }
    } else if (totalItems <= 7) {
      // 5-6张图片 + 1个添加按钮
      if (ratio > 1.5) {
        // 宽屏比例，4列2行
        cols = 4;
        rows = 2;
      } else if (ratio > 1) {
        // 横向比例，3列2行
        cols = 3;
        rows = 2;
      } else {
        // 纵向或正方形比例，3列2行
        cols = 3;
        rows = 2;
      }
    } else if (totalItems <= 10) {
      // 7-9张图片 + 1个添加按钮
      if (ratio > 1.5) {
        // 宽屏比例，5列2行
        cols = 5;
        rows = 2;
      } else if (ratio > 1) {
        // 横向比例，3列3行
        cols = 3;
        rows = 3;
      } else {
        // 纵向或正方形比例，3列3行
        cols = 3;
        rows = 3;
      }
    } else if (totalItems <= 13) {
      // 10-12张图片 + 1个添加按钮
      if (ratio > 1.5) {
        // 宽屏比例，5列3行
        cols = 5;
        rows = 3;
      } else if (ratio > 1) {
        // 横向比例，4列3行
        cols = 4;
        rows = 3;
      } else {
        // 纵向或正方形比例，4列3行
        cols = 4;
        rows = 3;
      }
    } else if (totalItems <= 17) {
      // 13-16张图片 + 1个添加按钮
      if (ratio > 1.5) {
        // 宽屏比例，5列4行
        cols = 5;
        rows = 4;
      } else if (ratio > 1) {
        // 横向比例，4列4行
        cols = 4;
        rows = 4;
      } else {
        // 纵向或正方形比例，4列4行
        cols = 4;
        rows = 4;
      }
    } else if (totalItems <= 21) {
      // 17-20张图片 + 1个添加按钮
      // 固定使用5x4网格，确保所有图片都能显示
      cols = 5;
      rows = 4;
    } else {
      // 超过20个项目（包括添加按钮），使用5x4网格
      cols = 5;
      rows = 4;
    }
    
    return { rows, cols };
  }

  /**
   * 渲染拼图
   */
  renderCollage() {
    const collageGrid = document.getElementById('collageGrid');
    let { rows, cols } = this.calculateGridLayout();
    
    // 应用纵横比并限制最大尺寸
    const aspectRatio = this.currentAspectRatio.split(':').map(Number);
    const widthRatio = aspectRatio[0];
    const heightRatio = aspectRatio[1];
    
    // 计算准确的宽高比
    const exactRatio = widthRatio / heightRatio;
    
    // 设置最大尺寸
    const maxWidth = 600;
    const maxHeight = 600;
    
    // 计算合适的尺寸，确保严格按照所选比例
    let targetWidth, targetHeight;
    if (exactRatio > 1) {
        // 横向比例，以宽度为基准
        targetWidth = Math.min(600, maxWidth);
        targetHeight = Math.round(targetWidth / exactRatio);
    } else {
        // 纵向或正方形比例，以高度为基准
        targetHeight = Math.min(600, maxHeight);
        targetWidth = Math.round(targetHeight * exactRatio);
    }
    
    // 确保画布尺寸严格按照所选比例
    collageGrid.style.width = `${targetWidth}px`;
    collageGrid.style.height = `${targetHeight}px`;
    collageGrid.style.aspectRatio = `${widthRatio} / ${heightRatio}`;
    
    // 清空画布
    collageGrid.innerHTML = '';
    
    // 根据图片数量调整网格布局
    if (this.images.length === 1) {
      // 1张图片，让它占据整个画布
      cols = 1;
      rows = 1;
      collageGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      collageGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      
      // 渲染图片
      const imageContainer = this.createImageContainer(0);
      collageGrid.appendChild(imageContainer);
      
      // 渲染添加图片按钮在新的一行
      if (this.images.length < this.maxImages) {
        const addBtn = this.createAddImageButton();
        // 创建一个新的容器来放置添加按钮，避免影响图片比例
        const addBtnContainer = document.createElement('div');
        addBtnContainer.style.gridColumn = '1 / -1';
        addBtnContainer.style.display = 'flex';
        addBtnContainer.style.justifyContent = 'center';
        addBtnContainer.style.alignItems = 'center';
        addBtnContainer.style.height = '100px';
        addBtnContainer.appendChild(addBtn);
        collageGrid.appendChild(addBtnContainer);
      }
    } else {
      // 多张图片的情况
      collageGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      collageGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      
      // 渲染图片
      for (let i = 0; i < this.images.length; i++) {
        const imageContainer = this.createImageContainer(i);
        collageGrid.appendChild(imageContainer);
      }
      
      // 渲染添加图片按钮（如果还有空间）
      if (this.images.length < this.maxImages) {
        const addBtn = this.createAddImageButton();
        collageGrid.appendChild(addBtn);
      }
    }
    
    // 渲染文字图层
    this.renderTextLayers();
    // 渲染贴纸图层
    this.renderStickerLayers();
    
    // 更新所有删除按钮的位置
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
      
      // 保存当前状态到撤销栈
      this.saveState();
      
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
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      this.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.redo();
    }
  }
  
  /**
   * 保存当前状态到撤销栈
   */
  saveState() {
    // 保存当前状态
    const state = {
      images: [...this.images],
      textLayers: JSON.parse(JSON.stringify(this.textLayers)),
      stickerLayers: JSON.parse(JSON.stringify(this.stickerLayers)),
      currentAspectRatio: this.currentAspectRatio,
      gutter: this.gutter,
      radius: this.radius
    };
    
    this.undoStack.push(state);
    this.redoStack = []; // 清空重做栈
    
    // 限制撤销栈大小
    if (this.undoStack.length > 20) {
      this.undoStack.shift();
    }
  }
  
  /**
   * 撤销操作
   */
  undo() {
    if (this.undoStack.length === 0) return;
    
    // 保存当前状态到重做栈
    this.redoStack.push({
      images: [...this.images],
      textLayers: JSON.parse(JSON.stringify(this.textLayers)),
      stickerLayers: JSON.parse(JSON.stringify(this.stickerLayers)),
      currentAspectRatio: this.currentAspectRatio,
      gutter: this.gutter,
      radius: this.radius
    });
    
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
    this.undoStack.push({
      images: [...this.images],
      textLayers: JSON.parse(JSON.stringify(this.textLayers)),
      stickerLayers: JSON.parse(JSON.stringify(this.stickerLayers)),
      currentAspectRatio: this.currentAspectRatio,
      gutter: this.gutter,
      radius: this.radius
    });
    
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
   * 创建图片容器
   */
  createImageContainer(index) {
    // 创建外层容器，用于放置删除按钮
    const outerContainer = document.createElement('div');
    outerContainer.className = 'image-outer-container';
    outerContainer.style.position = 'relative';
    outerContainer.style.display = 'inline-block';
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
    innerContainer.style.minHeight = '100px';
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
    
    // 移除现有的文字图层
    const existingTextLayers = collageCanvas.querySelectorAll('.text-layer');
    existingTextLayers.forEach(layer => layer.remove());
    
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
    
    // 移除现有的贴纸图层
    const existingStickerLayers = collageCanvas.querySelectorAll('.sticker-layer');
    existingStickerLayers.forEach(layer => layer.remove());
    
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
    });
    
    collageCanvas.appendChild(stickerContainer);
  }

  /**
   * 删除文字图层
   */
  removeTextLayer(layerId) {
    const layerIndex = this.textLayers.findIndex(l => l.id === layerId);
    if (layerIndex !== -1) {
      this.textLayers.splice(layerIndex, 1);
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
    // 获取画布容器
    const collageCanvas = document.getElementById('collageCanvas');
    const collageGrid = document.getElementById('collageGrid');
    
    // 检查元素是否存在
    if (!collageGrid || !collageCanvas) {
      alert(window.i18n.t('error.canvas_not_found'));
      return;
    }
    
    // 使用html2canvas库（假设已加载）
    if (typeof html2canvas !== 'undefined') {
      // 先隐藏底部工具栏和照片计数器，避免被捕获
      const bottomToolbar = document.querySelector('.bottom-toolbar');
      const bottomToolbarDisplay = bottomToolbar ? bottomToolbar.style.display : '';
      const photoCounter = document.getElementById('photoCounter');
      const photoCounterDisplay = photoCounter ? photoCounter.style.display : '';
      
      if (bottomToolbar) bottomToolbar.style.display = 'none';
      if (photoCounter) photoCounter.style.display = 'none';
      
      // 创建一个临时容器来组合所有可见内容
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '0';
      tempContainer.style.left = '0';
      tempContainer.style.zIndex = '9999';
      tempContainer.style.background = '#ffffff';
      tempContainer.style.padding = '20px';
      tempContainer.style.borderRadius = '0.75rem';
      
      // 复制collageGrid的样式
      const gridRect = collageGrid.getBoundingClientRect();
      tempContainer.style.width = `${gridRect.width}px`;
      tempContainer.style.height = `${gridRect.height}px`;
      
      // 复制collageGrid内容，但排除添加图片按钮
      const gridClone = collageGrid.cloneNode(true);
      gridClone.style.position = 'static';
      gridClone.style.margin = '0';
      
      // 移除添加图片按钮
      const addBtnClone = gridClone.querySelector('.add-image-btn');
      if (addBtnClone) {
        addBtnClone.parentElement.parentElement.remove();
      }
      
      // 将临时容器添加到body
      document.body.appendChild(tempContainer);
      tempContainer.appendChild(gridClone);
      
      // 重新应用滤镜效果到克隆的图片上
      const clonedImages = gridClone.querySelectorAll('.image-inner-container img');
      clonedImages.forEach((img, index) => {
        if (index < this.images.length) {
          const image = this.images[index];
          const filterStyle = this.getFilterStyle(image.filter);
          img.style.filter = filterStyle;
          img.style.webkitFilter = filterStyle;
        }
      });
      
      // 重新创建文字图层，确保位置准确
      const textContainer = document.createElement('div');
      textContainer.className = 'text-layers-container';
      textContainer.style.position = 'absolute';
      textContainer.style.top = '0';
      textContainer.style.left = '0';
      textContainer.style.width = `${gridRect.width}px`;
      textContainer.style.height = `${gridRect.height}px`;
      textContainer.style.pointerEvents = 'none';
      
      // 渲染每个文字图层到临时容器
      this.textLayers.forEach(layer => {
        const textWrapper = document.createElement('div');
        textWrapper.className = 'text-wrapper';
        textWrapper.style.position = 'absolute';
        textWrapper.style.left = `${layer.x * gridRect.width}px`;
        textWrapper.style.top = `${layer.y * gridRect.height}px`;
        textWrapper.style.transform = 'translate(-50%, -50%)';
        textWrapper.style.pointerEvents = 'all';
        textWrapper.style.zIndex = '10';
        textWrapper.style.display = 'inline-block';
        
        // 文本元素
        const textElement = document.createElement('div');
        textElement.className = 'text-layer';
        textElement.textContent = layer.content;
        textElement.style.position = 'relative';
        textElement.style.fontSize = `${layer.fontSize}px`;
        textElement.style.color = layer.color;
        textElement.style.fontWeight = layer.fontWeight;
        textElement.style.userSelect = 'none';
        
        textWrapper.appendChild(textElement);
        textContainer.appendChild(textWrapper);
      });
      
      tempContainer.appendChild(textContainer);
      
      // 重新创建贴纸图层，确保位置准确
      const stickerContainer = document.createElement('div');
      stickerContainer.className = 'sticker-layers-container';
      stickerContainer.style.position = 'absolute';
      stickerContainer.style.top = '0';
      stickerContainer.style.left = '0';
      stickerContainer.style.width = `${gridRect.width}px`;
      stickerContainer.style.height = `${gridRect.height}px`;
      stickerContainer.style.pointerEvents = 'none';
      
      // 渲染每个贴纸图层到临时容器
      this.stickerLayers.forEach(layer => {
        const stickerElement = document.createElement('div');
        stickerElement.className = 'sticker-layer';
        stickerElement.textContent = layer.content;
        stickerElement.style.position = 'absolute';
        stickerElement.style.left = `${layer.x * gridRect.width}px`;
        stickerElement.style.top = `${layer.y * gridRect.height}px`;
        stickerElement.style.transform = 'translate(-50%, -50%)';
        stickerElement.style.fontSize = `${layer.fontSize}px`;
        stickerElement.style.pointerEvents = 'all';
        
        stickerContainer.appendChild(stickerElement);
      });
      
      tempContainer.appendChild(stickerContainer);
      
      // 2. 使用html2canvas捕获临时容器，这是最可靠的方案
      html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true,
        scrollX: 0,
        scrollY: 0,
        // 启用foreignObject渲染以支持CSS滤镜
        foreignObjectRendering: true,
        // 确保所有元素都被正确捕获
        ignoreElements: (element) => {
          return element.classList.contains('remove-btn') || 
                 element.classList.contains('drag-handle') ||
                 element.classList.contains('image-menu-btn') ||
                 element.classList.contains('add-image-btn');
        }
      }).then(canvas => {
        // 3. 恢复原始样式
        if (bottomToolbar) bottomToolbar.style.display = bottomToolbarDisplay;
        if (photoCounter) photoCounter.style.display = photoCounterDisplay;
        
        // 4. 移除临时容器
        document.body.removeChild(tempContainer);
        
        // 5. 创建下载链接
        const link = document.createElement('a');
        link.download = `mecollage-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      }).catch(error => {
        // 6. 发生错误时也要恢复原始样式和清理
        if (bottomToolbar) bottomToolbar.style.display = bottomToolbarDisplay;
        if (photoCounter) photoCounter.style.display = photoCounterDisplay;
        
        // 7. 移除临时容器
        document.body.removeChild(tempContainer);
        
        console.error('Export failed:', error);
        alert('Export failed. Please try again. Error: ' + error.message);
      });
    } else {
      alert('Export feature requires html2canvas library');
    }
  }
}


