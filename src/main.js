// Main application logic
import { CollageMaker } from './collage-maker.js';
import { TemplateManager } from './template-manager.js';
import { ImageManager } from './image-manager.js';
import { ExportManager } from './export-manager.js';
import { i18n } from './i18n.js';
import { router } from './router.js';
import { blogManager } from './blog-manager.js';
import { seoManager } from './seo-manager.js';
import { uploadImageBlob, buildCloudinaryPagePublicId } from './cloudinary.js';
import { renderShareLinks } from './share.js';

const FILTER_PRESETS = [
    {
        id: 'original',
        nameKey: 'filters.presetOriginal',
        adjustments: { brightness: 100, contrast: 100, saturation: 100, warmth: 0, blur: 0 }
    },
    {
        id: 'warm',
        nameKey: 'filters.presetWarm',
        adjustments: { brightness: 105, contrast: 102, saturation: 118, warmth: 20, blur: 0 }
    },
    {
        id: 'vivid',
        nameKey: 'filters.presetVivid',
        adjustments: { brightness: 102, contrast: 108, saturation: 135, warmth: 5, blur: 0 }
    },
    {
        id: 'mono',
        nameKey: 'filters.presetMono',
        adjustments: { brightness: 105, contrast: 105, saturation: 0, warmth: 0, blur: 0 }
    },
    {
        id: 'film',
        nameKey: 'filters.presetFilm',
        adjustments: { brightness: 104, contrast: 98, saturation: 110, warmth: -10, blur: 1 }
    },
    {
        id: 'soft',
        nameKey: 'filters.presetSoft',
        adjustments: { brightness: 110, contrast: 92, saturation: 112, warmth: 12, blur: 2 }
    }
];

const FILTER_DEFAULT_ADJUSTMENTS = { brightness: 100, contrast: 100, saturation: 100, warmth: 0, blur: 0 };

class App {
    constructor() {
        this.imageManager = new ImageManager();
        this.templateManager = new TemplateManager();
        this.collageMaker = new CollageMaker();
        this.exportManager = new ExportManager();
        
        this.currentLayout = null;
        this.userSelectedTemplate = false;
        this.settings = {
            spacing: 5,
            border: 0,
            borderColor: '#ffffff',
            backgroundColor: '#ffffff',
            aspectRatio: 'auto',
            imageFit: 'cover'
        };
        this.decorations = [];
        this.decorationIdCounter = 0;
        this.stickerLibrary = this.getStickerLibrary();
        this.isMobileView = false;
        this.activeDecorationId = null;
        this.activeImageIndex = -1;
        this.dragState = null;
        this.sidebarSections = [];
        this.sectionToggles = [];
        this.mobileNavButtons = [];
        this.canvasExpandBtn = null;
        this.canvasCloseBtn = null;
        this.uploadCTAButton = null;
        this.canvasAreaEl = null;
        this.handleCanvasKeyUp = this.handleCanvasKeyUp.bind(this);
        this.handleDecorationPointerMove = this.handleDecorationPointerMove.bind(this);
        this.handleDecorationPointerUp = this.handleDecorationPointerUp.bind(this);
        this.filterPresetButtons = [];
        this.filterPresetContainer = null;
        this.filterBrightnessInput = null;
        this.filterContrastInput = null;
        this.filterSaturationInput = null;
        this.filterWarmthInput = null;
        this.filterBlurInput = null;
        this.filterResetBtn = null;
        this.filterEmptyMessage = null;
        this.filtersSectionContent = null;
        this.filterBlocks = [];
        this.filterSliderDisplays = {};
        this.filterTargetLabel = null;
        this.filterScopeGroup = null;
        this.filterScopeButtons = [];
        this.filterScope = 'single';
        this.imageDragState = null;
        this.imageFitButtons = [];
        this.imageFitHint = null;

        this.handleImageDragStart = this.handleImageDragStart.bind(this);
        this.handleImageDragOver = this.handleImageDragOver.bind(this);
        this.handleImageDragEnter = this.handleImageDragEnter.bind(this);
        this.handleImageDragLeave = this.handleImageDragLeave.bind(this);
        this.handleImageDrop = this.handleImageDrop.bind(this);
        this.handleImageDragEnd = this.handleImageDragEnd.bind(this);
        this.handleCanvasKeyUp = this.handleCanvasKeyUp.bind(this);
        this.handleDecorationPointerMove = this.handleDecorationPointerMove.bind(this);
        this.handleDecorationPointerUp = this.handleDecorationPointerUp.bind(this);
        
        this.init();
    }

    renderNavShare() {
        const container = document.getElementById('navShare');
        if (!container) return;
        renderShareLinks(container, {
            title: document.title,
            campaign: router.currentPage && router.currentPage.startsWith('blog/')
                ? `blog_${router.currentPage.split('/')[1]}`
                : router.currentPage || 'home',
            medium: 'header'
        });
    }
    
    init() {
        this.setupEventListeners();
        this.setupLanguageSwitcher();
        this.setupNavigation();
        this.setupResponsiveControls();
        this.setupBackToTop();
        this.setupFilterControls();
        this.setupBlog();
        this.templateManager.loadFavorites();
        this.templateManager.renderThemeNavigator();
        this.templateManager.renderCategories();
        this.templateManager.renderTemplates();
        this.updateImageCount();
        
        // Initialize SEO for current page
        const initialPage = router.currentPage || 'home';
        seoManager.updateSEO(initialPage);
        this.renderNavShare();
        
        // Listen for language changes
        document.addEventListener('language-changed', () => {
            this.refreshLanguageDependentUI();
            // Re-render blog page if on blog page
            if (router.currentPage === 'blog' || router.currentPage.startsWith('blog/')) {
                if (router.currentPage === 'blog') {
                    this.renderBlogPage();
                    // Update SEO for blog list page
                    seoManager.updateSEO('blog');
                } else {
                    const postId = router.currentPage.replace('blog/', '');
                    const post = blogManager.getPostById(postId);
                    if (post) {
                        router.renderBlogPost(post);
                        // Update SEO for blog post
                        seoManager.updateSEO(`blog/${postId}`, post);
                    }
                }
            } else {
                // Update SEO for current page when language changes
                seoManager.updateSEO(router.currentPage);
            }
            // Refresh header share labels/links on language change
            this.renderNavShare();
        });
    }
    
    setupLanguageSwitcher() {
         const langSelector = document.querySelector('.lang-selector');
         const toggle = langSelector?.querySelector('.lang-selector-toggle');
         const menu = langSelector?.querySelector('.lang-menu');
         const options = langSelector ? Array.from(langSelector.querySelectorAll('.lang-option')) : [];
        const backdrop = langSelector?.querySelector('.lang-menu-backdrop');
 
        if (!langSelector || !toggle || !menu || !options.length || !backdrop) {
            return;
        }

        const closeMenu = () => {
            langSelector.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            backdrop.setAttribute('aria-hidden', 'true');
        };

        const openMenu = () => {
            langSelector.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
            backdrop.setAttribute('aria-hidden', 'false');
        };

        const updateActiveOption = () => {
            const activeOption = langSelector.querySelector(`.lang-option[data-lang="${i18n.currentLang}"]`);
            options.forEach((option) => {
                option.classList.toggle('is-active', option === activeOption);
            });
            // Update language selector
            const langSelectorLabel = document.querySelector('.lang-selector-toggle [data-i18n="lang.name"]');
            if (langSelectorLabel) {
                langSelectorLabel.textContent = i18n.t('lang.name');
            }
        };

        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = langSelector.classList.contains('is-open');
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        backdrop.addEventListener('click', () => {
            closeMenu();
        });

        options.forEach((option) => {
            option.addEventListener('click', (event) => {
                event.stopPropagation();
                const lang = option.dataset.lang;
                if (lang && i18n.currentLang !== lang) {
                    i18n.setLanguage(lang);
                }
                closeMenu();
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && langSelector.classList.contains('is-open')) {
                closeMenu();
            }
        });

        document.addEventListener('language-changed', updateActiveOption);

        updateActiveOption();
    }
    
    setupNavigation() {
        // Handle navigation links
        document.querySelectorAll('.nav-link, .quick-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                // Only handle internal links
                if (href && (href.startsWith('/') || href.startsWith('#'))) {
                    e.preventDefault();
                    const page = link.dataset.page || this.getPageFromHref(href);
                    if (page) {
                        if (page.startsWith('blog/')) {
                            const postId = page.replace('blog/', '');
                            router.showBlogPost(postId, true);
                        } else {
                            router.navigate(page);
                            // Render blog page if navigating to blog
                            if (page === 'blog') {
                                setTimeout(() => this.renderBlogPage(), 100);
                            }
                        }
                        this.renderNavShare();
                    }
                }
            });
        });
        
        // Handle blog post links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="/blog/"]');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                const postId = href.replace('/blog/', '');
                router.showBlogPost(postId, true);
                this.renderNavShare();
            }
        });
    }
    
    getPageFromHref(href) {
        if (href === '/' || href === '/index.html' || href === '#home') return 'home';
        if (href.startsWith('/blog/') || href.startsWith('#blog/')) {
            const postId = href.replace(/^\/blog\//, '').replace(/^#blog\//, '');
            return `blog/${postId}`;
        }
        const path = href.replace(/^#/, '').replace(/^\//, '').replace(/\.html$/, '');
        return path || 'home';
    }

    setupEventListeners() {
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
            await this.handleFiles(files);
        });

        fileInput.addEventListener('change', async (e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (!files.length) return;
            await this.handleFiles(files);
            this.resetFileInput();
        });

        this.uploadCTAButton = document.getElementById('uploadCtaBtn');
        if (this.uploadCTAButton) {
            this.uploadCTAButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                fileInput.click();
            });
        }

        // Template selection
        document.addEventListener('template-selected', (e) => {
            const { template, auto = false } = e.detail;
            this.selectTemplate(template, auto);
        });

        // Custom grid
        document.getElementById('applyCustomGrid').addEventListener('click', () => {
            const rows = parseInt(document.getElementById('customRows').value);
            const cols = parseInt(document.getElementById('customCols').value);
            this.selectTemplate({ type: 'grid', rows, cols });
            this.templateManager.clearActiveSelection();
        });

        // Settings
        const spacingSlider = document.getElementById('spacingSlider');
        const borderSlider = document.getElementById('borderSlider');
        const qualitySlider = document.getElementById('qualitySlider');

        spacingSlider.addEventListener('input', (e) => {
            this.settings.spacing = parseInt(e.target.value);
            document.getElementById('spacingValue').textContent = `${this.settings.spacing}px`;
            this.updateRangeProgress('spacingSlider', 'spacingProgress');
            this.renderCollage();
        });

        borderSlider.addEventListener('input', (e) => {
            this.settings.border = parseInt(e.target.value);
            document.getElementById('borderValue').textContent = `${this.settings.border}px`;
            this.updateRangeProgress('borderSlider', 'borderProgress');
            this.renderCollage();
        });

        document.getElementById('borderColor').addEventListener('change', (e) => {
            this.settings.borderColor = e.target.value;
            this.renderCollage();
        });

        document.getElementById('backgroundColor').addEventListener('change', (e) => {
            this.settings.backgroundColor = e.target.value;
            this.renderCollage();
        });

        this.imageFitButtons = Array.from(document.querySelectorAll('.image-fit-option'));
        this.imageFitHint = document.getElementById('imageFitHint');
        this.imageFitButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const fit = button.dataset.fit;
                if (!fit || this.settings.imageFit === fit) return;
                this.settings.imageFit = fit;
                this.updateImageFitToggle();
                this.renderCollage();
            });
        });
        this.updateImageFitToggle();

        // Export
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportCollage();
        });
        const uploadPublicBtn = document.getElementById('uploadPublicBtn');
        if (uploadPublicBtn) {
            uploadPublicBtn.addEventListener('click', () => this.uploadPublicWork());
        }

        qualitySlider.addEventListener('input', (e) => {
            const quality = parseFloat(e.target.value);
            document.getElementById('qualityValue').textContent = `${Math.round(quality * 100)}%`;
            this.updateRangeProgress('qualitySlider', 'qualityProgress');
        });

        const exportSizePreset = document.getElementById('exportSizePreset');
        if (exportSizePreset) {
            exportSizePreset.addEventListener('change', (e) => {
                this.settings.aspectRatio = e.target.value;
                this.renderCollage();
            });
        }

        this.updateRangeProgress('spacingSlider', 'spacingProgress');
        this.updateRangeProgress('borderSlider', 'borderProgress');
        this.updateRangeProgress('qualitySlider', 'qualityProgress');

        this.setupDecorationControls();
    }

    setupBackToTop() {
        const backToTopBtn = document.getElementById('backToTop');
        if (!backToTopBtn) {
            return;
        }

        const updateButtonState = () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile && window.scrollY > 240) {
                backToTopBtn.classList.add('is-visible');
            } else {
                backToTopBtn.classList.remove('is-visible');
            }
        };

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', updateButtonState, { passive: true });
        window.addEventListener('resize', updateButtonState);

        this.updateBackToTopLabel();
        updateButtonState();
    }
    
    setupBlog() {
        // Make blogManager globally available for router
        window.blogManager = blogManager;
        
        // Initialize blog page when navigated to
        const checkBlogPage = () => {
            const path = window.location.pathname;
            if (path === '/blog' || path === '/blog/') {
                this.renderBlogPage();
            }
        };
        
        // Check on load
        checkBlogPage();
        
        // Setup search
        const searchInput = document.getElementById('blogSearchInput');
        const searchBtn = document.querySelector('.blog-search-btn');
        
        const performSearch = () => {
            if (searchInput) {
                blogManager.searchQuery = searchInput.value.trim();
                this.renderBlogPage();
            }
        };
        
        if (searchInput) {
            searchInput.addEventListener('input', performSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', performSearch);
        }
    }
    
    renderBlogPage() {
        // Update page title and subtitle
        const pageTitle = document.querySelector('#page-blog .page-title');
        const pageSubtitle = document.querySelector('#page-blog .page-subtitle');
        if (pageTitle) pageTitle.textContent = i18n.t('blog.title');
        if (pageSubtitle) pageSubtitle.textContent = i18n.t('blog.subtitle');
        
        // Update search placeholder
        const searchInput = document.getElementById('blogSearchInput');
        if (searchInput) {
            searchInput.placeholder = i18n.t('blog.searchPlaceholder');
        }
        
        // Render categories with translations
        const categoriesContainer = document.getElementById('blogCategories');
        if (categoriesContainer) {
            const categories = blogManager.getCategories();
            const categoryMap = {
                'All': i18n.t('blog.categories.all'),
                'Tutorial': i18n.t('blog.categories.tutorial'),
                'Design Tips': i18n.t('blog.categories.designTips'),
                'Holiday': i18n.t('blog.categories.holiday'),
                'Mobile': i18n.t('blog.categories.mobile'),
                'Social Media': i18n.t('blog.categories.socialMedia'),
                'Portfolio': i18n.t('blog.categories.portfolio')
            };
            
            categoriesContainer.innerHTML = categories.map(cat => 
                `<button type="button" class="blog-category-btn ${blogManager.currentCategory === cat ? 'is-active' : ''}" 
                         data-category="${cat}" role="tab">${categoryMap[cat] || cat}</button>`
            ).join('');
            
            // Add click handlers
            categoriesContainer.querySelectorAll('.blog-category-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    blogManager.currentCategory = btn.dataset.category;
                    this.renderBlogPage();
                });
            });
        }
        
        // Render popular tags
        const tagsContainer = document.getElementById('blogTagsFilter');
        if (tagsContainer) {
            const allTags = blogManager.getAllTags();
            const popularTags = allTags.slice(0, 8); // Show top 8 tags
            tagsContainer.innerHTML = `
                <span class="blog-tags-label">${i18n.t('blog.popularTags')}</span>
                ${popularTags.map(tag => 
                    `<button type="button" class="blog-tag-btn" data-tag="${tag}">#${tag}</button>`
                ).join('')}
            `;
            
            // Add click handlers
            tagsContainer.querySelectorAll('.blog-tag-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const searchInput = document.getElementById('blogSearchInput');
                    if (searchInput) {
                        searchInput.value = btn.dataset.tag;
                        blogManager.searchQuery = btn.dataset.tag;
                        this.renderBlogPage();
                    }
                });
            });
        }
        
        // Render blog posts
        const blogList = document.getElementById('blogList');
        const blogEmpty = document.getElementById('blogEmpty');
        
        if (blogList) {
            const currentLang = i18n.currentLang;
            const posts = blogManager.getFilteredPosts(currentLang);
            
            if (posts.length === 0) {
                blogList.style.display = 'none';
                if (blogEmpty) {
                    blogEmpty.style.display = 'block';
                    blogEmpty.querySelector('p').textContent = i18n.t('blog.noArticles');
                }
            } else {
                blogList.style.display = 'grid';
                if (blogEmpty) blogEmpty.style.display = 'none';
                
                const categoryMap = {
                    'Tutorial': i18n.t('blog.categories.tutorial'),
                    'Design Tips': i18n.t('blog.categories.designTips'),
                    'Holiday': i18n.t('blog.categories.holiday'),
                    'Mobile': i18n.t('blog.categories.mobile'),
                    'Social Media': i18n.t('blog.categories.socialMedia'),
                    'Portfolio': i18n.t('blog.categories.portfolio')
                };
                
                blogList.innerHTML = posts.map(post => {
                    const localizedPost = blogManager.getLocalizedPost(post, currentLang);
                    return `
                    <article class="blog-post">
                        <h2 class="blog-post-title">
                            <a href="/blog/${post.id}">${localizedPost.title}</a>
                        </h2>
                        <div class="blog-post-meta">
                            <span class="blog-date">${this.formatBlogDate(post.date)}</span>
                            <span class="blog-category">${categoryMap[post.category] || post.category}</span>
                        </div>
                        <p class="blog-post-excerpt">${localizedPost.excerpt}</p>
                        <div class="blog-post-tags">
                            ${post.tags.map(tag => `<span class="blog-tag">#${tag}</span>`).join('')}
                        </div>
                        <a href="/blog/${post.id}" class="blog-read-more">${i18n.t('blog.readMore')} →</a>
                    </article>
                `;
                }).join('');
            }
        }
    }
    
    formatBlogDate(dateString) {
        const date = new Date(dateString);
        const lang = i18n.currentLang;
        const localeMap = {
            'en': 'en-US',
            'zh': 'zh-CN',
            'es': 'es-ES'
        };
        const locale = localeMap[lang] || 'en-US';
        return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    updateBackToTopLabel() {
        const backToTopBtn = document.getElementById('backToTop');
        if (!backToTopBtn) {
            return;
        }

        backToTopBtn.setAttribute('aria-label', i18n.t('common.backToTop'));
        const labelSpan = backToTopBtn.querySelector('span[data-i18n]');
        if (labelSpan) {
            labelSpan.textContent = i18n.t('common.backToTop');
        }
    }

    async handleFiles(fileList) {
        if (!fileList || typeof fileList.length === 'undefined') {
            return;
        }

        const files = Array.from(fileList);
        const imageFiles = files.filter(file => file.type && file.type.startsWith('image/'));
        if (!imageFiles.length) {
            return;
        }

        const hadImagesBefore = this.imageManager.getImages().length > 0;

        for (const file of imageFiles) {
            await this.imageManager.addImage(file);
        }

        const totalImages = this.imageManager.getImages().length;
        if (totalImages > 0) {
            if (hadImagesBefore) {
                this.activeImageIndex = Math.min(this.activeImageIndex >= 0 ? this.activeImageIndex : 0, totalImages - 1);
            } else {
                this.activeImageIndex = 0;
            }
        }

        this.updateImageCount();
        this.updateImageList();
        this.handleImageCollectionChange();
    }

    selectTemplate(template, isAuto = false) {
        this.currentLayout = template;
        if (!isAuto) {
            this.userSelectedTemplate = true;
        }
        this.renderCollage();
    }

    renderCollage() {
        const images = this.imageManager.getImages();

        if (images.length === 0) {
            document.getElementById('canvasPlaceholder').style.display = 'flex';
            document.getElementById('collageCanvas').style.display = 'none';
            return;
        }

        document.getElementById('canvasPlaceholder').style.display = 'none';
        document.getElementById('collageCanvas').style.display = 'block';

        this.decorations.forEach((decoration) => this.ensureDecorationCoordinates(decoration));

        if (!this.currentLayout) {
            // Default to grid based on image count
            const count = images.length;
            if (count <= 1) {
                this.currentLayout = { type: 'grid', rows: 1, cols: 1 };
            } else {
                const cols = Math.ceil(Math.sqrt(count));
                const rows = Math.ceil(count / cols);
                this.currentLayout = { type: 'grid', rows, cols };
            }
        }

        this.collageMaker.render(
            document.getElementById('collageCanvas'),
            images,
            this.currentLayout,
            this.settings,
            this.decorations
        );

        this.bindDecorationOverlayEvents();
    }

    updateImageCount() {
        const count = this.imageManager.getImages().length;
        i18n.updateImageCount(count);
    }

    updateImageList() {
        const imageList = document.getElementById('imageList');
        const images = this.imageManager.getImages();
        if (!images.length) {
            imageList.innerHTML = '';
            this.activeImageIndex = -1;
            this.syncFilterControls();
            return;
        }

        if (this.activeImageIndex < 0 || this.activeImageIndex >= images.length) {
            this.activeImageIndex = 0;
        }

        imageList.innerHTML = images.map((img, index) => `
            <div class="image-item${index === this.activeImageIndex ? ' is-selected' : ''}" data-index="${index}" draggable="true">
                <img src="${img.url}" alt="Image ${index + 1}">
                <div class="image-item-footer">
                    <button class="image-reorder-handle" type="button" aria-label="${i18n.t('imagePanel.dragHandle')}">
                        <span aria-hidden="true">⋮⋮</span>
                    </button>
                    <div class="image-order-buttons">
                        <button class="image-move-btn move-up" type="button" data-index="${index}" aria-label="${i18n.t('imagePanel.moveUp')}" ${index === 0 ? 'disabled' : ''}>
                            <span aria-hidden="true">▲</span>
                        </button>
                        <button class="image-move-btn move-down" type="button" data-index="${index}" aria-label="${i18n.t('imagePanel.moveDown')}" ${index === images.length - 1 ? 'disabled' : ''}>
                            <span aria-hidden="true">▼</span>
                        </button>
                    </div>
                </div>
                <button class="remove-btn" data-index="${index}" aria-label="${i18n.t('imagePanel.remove')}" title="${i18n.t('imagePanel.remove')}"></button>
            </div>
        `).join('');

        imageList.querySelectorAll('.image-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.setActiveImage(index);
            });
            item.addEventListener('dragstart', this.handleImageDragStart);
            item.addEventListener('dragover', this.handleImageDragOver);
            item.addEventListener('dragenter', this.handleImageDragEnter);
            item.addEventListener('dragleave', this.handleImageDragLeave);
            item.addEventListener('drop', this.handleImageDrop);
            item.addEventListener('dragend', this.handleImageDragEnd);
        });

        imageList.querySelectorAll('.remove-btn').forEach(btn => {
             btn.addEventListener('click', (e) => {
                 e.stopPropagation();
                 const index = parseInt(e.target.dataset.index);
                 this.imageManager.removeImage(index);
                 this.updateImageCount();
                 const remaining = this.imageManager.getImages().length;
                 if (remaining === 0) {
                     this.activeImageIndex = -1;
                 } else if (this.activeImageIndex >= remaining) {
                     this.activeImageIndex = remaining - 1;
                 }
                 this.updateImageList();
                 this.handleImageCollectionChange();
             });
         });

        imageList.querySelectorAll('.image-reorder-handle').forEach((handle) => {
            handle.addEventListener('mousedown', (event) => {
                event.stopPropagation();
            });
            handle.addEventListener('touchstart', (event) => {
                event.stopPropagation();
            }, { passive: true });
        });

        imageList.querySelectorAll('.image-move-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const fromIndex = parseInt(button.dataset.index, 10);
                if (Number.isNaN(fromIndex)) return;
                const direction = button.classList.contains('move-up') ? -1 : 1;
                this.nudgeImagePosition(fromIndex, direction);
            });
        });

        this.syncFilterControls();
        i18n.updateSidebar();
     }

    refreshLanguageDependentUI() {
        const imageCount = this.imageManager.getImages().length;
        const currentTemplateKey = this.currentLayout?.key || this.templateManager.getActiveTemplateKey();

        const bestKey = this.templateManager.getBestTemplateKeyForCount(imageCount)
            || this.templateManager.getRecommendedKeys()[0]
            || this.templateManager.getDefaultTemplateKey();

        const templateKeyToRender = this.userSelectedTemplate && currentTemplateKey
            ? currentTemplateKey
            : bestKey;

        const templateForLanguage = templateKeyToRender ? this.templateManager.getTemplateByKey(templateKeyToRender) : null;

        if (templateForLanguage) {
            this.selectTemplate(templateForLanguage, true);
            this.templateManager.activateTemplate(templateKeyToRender, { dispatch: false, auto: !this.userSelectedTemplate });
        } else {
            this.renderCollage();
        }

        this.templateManager.renderThemeNavigator();
        this.templateManager.renderCategories();
        this.templateManager.renderTemplates();
        this.templateManager.updateRecommendations(imageCount);
        this.updateImageCount();
        this.updateBackToTopLabel();
        this.updateMobileNavLabels();
        this.renderDecorationList();
        this.updateStickerOptionLabels();
        this.renderFilterPresets();
        this.setupFilterLocalization();
        this.updateImageList();
        this.templateManager.renderRecommendationSummary();
        this.templateManager.refreshTemplateTexts();
        i18n.updateSidebar();
        this.syncFilterControls();
        this.updateImageFitToggle();
    }

    setupFilterLocalization() {
        if (this.filterPresetContainer) {
            this.filterPresetContainer.querySelectorAll('.filter-preset').forEach((button) => {
                const presetId = button.dataset.id;
                const preset = FILTER_PRESETS.find((presetItem) => presetItem.id === presetId);
                const labelEl = button.querySelector('.filter-preset-label');
                if (preset && labelEl) {
                    labelEl.textContent = i18n.t(preset.nameKey);
                }
            });
        }

        if (this.filterScopeButtons && this.filterScopeButtons.length) {
            this.filterScopeButtons.forEach((button) => {
                const scopeKey = button.dataset.scope === 'all'
                    ? 'filters.scopeAll'
                    : 'filters.scopeCurrent';
                button.textContent = i18n.t(scopeKey);
            });
        }

        if (this.filterEmptyMessage) {
            this.filterEmptyMessage.textContent = i18n.t('filters.noImage');
        }
    }

    handleImageCollectionChange() {
        const images = this.imageManager.getImages();
        const count = images.length;

        if (count === 0) {
            this.activeImageIndex = -1;
            this.currentLayout = null;
            this.userSelectedTemplate = false;
            this.renderCollage();
            this.syncFilterControls();
            this.templateManager.updateRecommendations(count);
            return;
        }

        const bestKey = this.templateManager.getBestTemplateKeyForCount(count)
            || this.templateManager.getRecommendedKeys()[0]
            || this.templateManager.getDefaultTemplateKey();

        if (bestKey) {
            const bestTemplate = this.templateManager.getTemplateByKey(bestKey);
            if (bestTemplate) {
                this.userSelectedTemplate = false;
                this.selectTemplate(bestTemplate, true);
                this.templateManager.activateTemplate(bestKey, { dispatch: false, auto: true });
            }
        } else {
            this.renderCollage();
        }

        this.syncFilterControls();
        this.templateManager.updateRecommendations(count);
    }

    async exportCollage() {
        const canvas = document.getElementById('collageCanvas');
        const quality = parseFloat(document.getElementById('qualitySlider').value);
        const format = document.getElementById('exportFormat').value;
        
        await this.exportManager.export({
            element: canvas,
            quality,
            format,
            images: this.imageManager.getImages(),
            decorations: this.decorations,
            settings: this.settings
        });
    }

    async uploadPublicWork() {
        const resultBox = document.getElementById('publicUploadResult');
        const btn = document.getElementById('uploadPublicBtn');
        if (!resultBox || !btn) return;
        try {
            btn.disabled = true;
            btn.textContent = i18n.t('works.uploading');
            resultBox.style.display = 'none';
            resultBox.innerHTML = '';

            // Render current collage to canvas at current quality; upload JPG for compatibility
            const canvas = document.getElementById('collageCanvas');
            if (!canvas || canvas.style.display === 'none') {
                // Ensure something to export
                this.renderCollage();
            }
            const exportCanvas = await this.exportManager.renderToCanvas({
                element: document.getElementById('collageCanvas'),
                images: this.imageManager.getImages(),
                decorations: this.decorations,
                settings: this.settings,
                quality: 1,
                format: 'jpg'
            });
            const blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, 'image/jpeg', 0.92));
            if (!blob) throw new Error('Failed to create image blob');

            const uploadRes = await uploadImageBlob(blob, { folder: 'works', fileName: `collage-${Date.now()}.jpg` });
            const imageUrl = uploadRes.secure_url;
            const publicId = uploadRes.public_id; // e.g., works/abc123
            const worksId = buildCloudinaryPagePublicId(publicId);
            const worksUrl = `/works/${worksId}`;

            // Show result UI
            const embedCode = `<a href="https://www.mecollage.top${worksUrl}" target="_blank" rel="noopener"><img src="${imageUrl}" alt="MeCollage Public Work" /></a>`;
            resultBox.innerHTML = `
                <div>${i18n.t('works.uploadDone')}</div>
                <div class="result-actions">
                    <a href="${worksUrl}" class="btn" target="_blank" rel="noopener">${i18n.t('works.viewPublicPage')}</a>
                    <button type="button" id="copyImageUrlBtn">${i18n.t('works.copyImageUrl')}</button>
                    <button type="button" id="copyEmbedBtn">${i18n.t('works.copyEmbedCode')}</button>
                </div>
                <div style="margin-top:8px;">
                    <div style="opacity:.8;font-size:12px;margin-bottom:4px;">${i18n.t('works.embedLabel')}:</div>
                    <textarea id="embedCodeArea" readonly rows="3" style="width:100%;resize:vertical;">${embedCode}</textarea>
                </div>
            `;
            resultBox.style.display = 'block';

            const copyUrlBtn = document.getElementById('copyImageUrlBtn');
            const copyEmbedBtn = document.getElementById('copyEmbedBtn');
            const embedArea = document.getElementById('embedCodeArea');
            copyUrlBtn?.addEventListener('click', async () => {
                await navigator.clipboard.writeText(imageUrl);
                const { showToast } = await import('./share.js');
                showToast?.(i18n.t('share.copied'));
            });
            copyEmbedBtn?.addEventListener('click', async () => {
                await navigator.clipboard.writeText(embedArea.value);
                const { showToast } = await import('./share.js');
                showToast?.(i18n.t('share.copied'));
            });
        } catch (err) {
            console.error(err);
            alert(err?.message || 'Upload failed');
        } finally {
            btn.disabled = false;
            btn.textContent = i18n.t('works.uploadAndLink');
        }
    }

    updateRangeProgress(sliderId, progressId) {
        const slider = document.getElementById(sliderId);
        const progress = document.getElementById(progressId);
        if (!slider || !progress) return;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 1;
        const value = parseFloat(slider.value);
        const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
        progress.style.width = `${percent}%`;
    }

    updateImageFitToggle() {
        if (!this.imageFitButtons || !this.imageFitButtons.length) return;
        this.imageFitButtons.forEach((button) => {
            const isActive = button.dataset.fit === this.settings.imageFit;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        if (this.imageFitHint) {
            const hintKey = this.settings.imageFit === 'contain'
                ? 'sidebar.imageFitHintContain'
                : 'sidebar.imageFitHintCover';
            this.imageFitHint.textContent = i18n.t(hintKey);
        }
    }

    setupDecorationControls() {
        this.decorationListEl = document.getElementById('decorationList');
        const addTextBtn = document.getElementById('addTextBtn');
        this.textInput = document.getElementById('decorTextContent');
        this.textColorInput = document.getElementById('decorTextColor');
        this.textSizeSelect = document.getElementById('decorTextSize');
        this.textPositionSelect = document.getElementById('decorTextPosition');
        this.textSwatchRow = document.getElementById('decorTextSwatches');
        this.textMoreBtn = document.getElementById('decorTextMore');
        const stickerOptionsEl = document.getElementById('stickerOptions');
        this.stickerSizeSelect = document.getElementById('decorStickerSize');
        this.stickerPositionSelect = document.getElementById('decorStickerPosition');

        if (stickerOptionsEl) {
            stickerOptionsEl.innerHTML = '';
            this.stickerLibrary.forEach((sticker) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'sticker-option';
                button.textContent = sticker.emoji;
                button.dataset.stickerId = sticker.id;
                try {
                    const label = i18n.t(sticker.labelKey);
                    button.setAttribute('aria-label', label);
                    button.setAttribute('title', label);
                } catch (error) {
                    button.setAttribute('aria-label', sticker.fallbackLabel);
                    button.setAttribute('title', sticker.fallbackLabel);
                }
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.addStickerDecoration(sticker);
                });
                stickerOptionsEl.appendChild(button);
            });
        }

        if (addTextBtn) {
            addTextBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleAddTextDecoration();
            });
        }

        if (this.textInput) {
            this.textInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.handleAddTextDecoration();
                }
            });

            this.textInput.addEventListener('input', () => {
                if (!this.activeDecorationId) return;
                this.updateActiveDecoration({ content: this.textInput.value }, ['text']);
            });
        }

        if (this.textSwatchRow) {
            this.renderTextSwatches();
        }

        if (this.textMoreBtn && this.textColorInput) {
            this.textMoreBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.textColorInput.click();
            });
        }

        if (this.textColorInput) {
            this.textColorInput.addEventListener('input', () => {
                this.updateActiveDecoration({ color: this.textColorInput.value }, ['text']);
                this.highlightActiveSwatch(this.textColorInput.value);
            });
        }

        if (this.textSizeSelect) {
            this.textSizeSelect.addEventListener('change', () => {
                this.updateActiveDecoration({ size: this.textSizeSelect.value }, ['text']);
            });
        }

        if (this.textPositionSelect) {
            this.textPositionSelect.addEventListener('change', () => {
                const value = this.textPositionSelect.value;
                if (value === 'custom') {
                    this.updateActiveDecoration({ position: 'custom' }, ['text']);
                    return;
                }
                const coords = this.positionToCoordinates(value);
                this.updateActiveDecoration({ position: value, x: coords.x, y: coords.y }, ['text']);
            });
        }

        if (this.stickerSizeSelect) {
            this.stickerSizeSelect.addEventListener('change', () => {
                this.updateActiveDecoration({ size: this.stickerSizeSelect.value }, ['sticker']);
            });
        }

        if (this.stickerPositionSelect) {
            this.stickerPositionSelect.addEventListener('change', () => {
                const value = this.stickerPositionSelect.value;
                if (value === 'custom') {
                    this.updateActiveDecoration({ position: 'custom' }, ['sticker']);
                    return;
                }
                const coords = this.positionToCoordinates(value);
                this.updateActiveDecoration({ position: value, x: coords.x, y: coords.y }, ['sticker']);
            });
        }

        this.renderDecorationList();
        this.updateStickerOptionLabels();
        this.syncControlsWithActiveDecoration();
    }

    setupFilterControls() {
        this.filterPresetContainer = document.getElementById('filterPresets');
        this.filterBrightnessInput = document.getElementById('filterBrightness');
        this.filterContrastInput = document.getElementById('filterContrast');
        this.filterSaturationInput = document.getElementById('filterSaturation');
        this.filterWarmthInput = document.getElementById('filterWarmth');
        this.filterBlurInput = document.getElementById('filterBlur');
        this.filterResetBtn = document.getElementById('filterResetBtn');
        this.filterEmptyMessage = document.getElementById('filterEmptyMessage');
        this.filtersSectionContent = document.getElementById('filtersSectionContent');

        if (!this.filtersSectionContent) return;

        this.filterBlocks = Array.from(this.filtersSectionContent.querySelectorAll('.filter-block'));
        this.filterSliderDisplays = {
            brightness: document.getElementById('filterBrightnessValue'),
            contrast: document.getElementById('filterContrastValue'),
            saturation: document.getElementById('filterSaturationValue'),
            warmth: document.getElementById('filterWarmthValue'),
            blur: document.getElementById('filterBlurValue')
        };

        this.filterTargetLabel = document.getElementById('filterActiveTarget');
        this.filterScopeGroup = document.getElementById('filterScopeGroup');
        if (this.filterScopeGroup) {
            this.filterScopeGroup.setAttribute('aria-label', i18n.t('filters.scopeAria'));
        }
        this.filterScopeButtons = Array.from(document.querySelectorAll('.filter-scope-btn'));
        this.filterScopeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const scope = button.dataset.scope;
                this.setFilterScope(scope);
            });
        });

        this.renderFilterPresets();
        this.setupFilterLocalization();

        const sliderConfig = [
            { input: this.filterBrightnessInput, key: 'brightness' },
            { input: this.filterContrastInput, key: 'contrast' },
            { input: this.filterSaturationInput, key: 'saturation' },
            { input: this.filterWarmthInput, key: 'warmth' },
            { input: this.filterBlurInput, key: 'blur' }
        ];

        sliderConfig.forEach(({ input, key }) => {
            if (!input) return;
            input.addEventListener('input', (event) => {
                const value = parseInt(event.target.value, 10);
                if (Number.isNaN(value)) return;
                this.updateFilterAdjustment(key, value);
            });
        });

        if (this.filterResetBtn) {
            this.filterResetBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.resetFilters();
            });
        }

        this.syncFilterControls();

        document.addEventListener('language-changed', () => {
            if (this.filterScopeGroup) {
                this.filterScopeGroup.setAttribute('aria-label', i18n.t('filters.scopeAria'));
            }
            this.updateFilterTargetLabel();
        });
    }

    renderFilterPresets() {
        if (!this.filterPresetContainer) return;
 
         this.filterPresetContainer.innerHTML = FILTER_PRESETS.map((preset) => {
             const label = i18n.t(preset.nameKey);
             const previewFilter = this.collageMaker.buildFilterString({ adjustments: preset.adjustments }) || 'none';
             return `
                 <button type="button" class="filter-preset" data-id="${preset.id}">
                     <span class="filter-preset-thumb" style="filter:${previewFilter};"></span>
                    <span class="filter-preset-label" data-i18n="${preset.nameKey}">${label}</span>
                 </button>
             `;
         }).join('');
 
         this.filterPresetButtons = Array.from(this.filterPresetContainer.querySelectorAll('.filter-preset'));
         this.filterPresetButtons.forEach((button) => {
             button.addEventListener('click', () => {
                 const presetId = button.dataset.id;
                 this.applyFilterPreset(presetId);
             });
         });
         this.highlightActiveFilterPreset(this.getActiveImage()?.filters?.preset);
        this.updateFilterScopeUI();
    }

    forEachFilterTarget(callback) {
        const images = this.imageManager.getImages();
        if (!images.length) return [];

        if (this.filterScope === 'all') {
            images.forEach((image, index) => callback(image, index));
            return images;
        }

        let target = this.getActiveImage();
        if (!target) {
            this.activeImageIndex = 0;
            target = this.getActiveImage();
        }

        if (target) {
            callback(target, this.activeImageIndex);
            return [target];
        }

        return [];
    }

    setFilterScope(scope) {
        if (scope !== 'single' && scope !== 'all') return;
        if (this.filterScope === scope) {
            this.updateFilterScopeUI();
            return;
        }

        this.filterScope = scope;

        if (scope === 'all') {
            this.syncAllImagesWithActive();
        }

        this.updateFilterScopeUI();
        this.renderCollage();
        this.syncFilterControls();
    }

    syncAllImagesWithActive() {
        const images = this.imageManager.getImages();
        if (!images.length) return;

        const reference = this.getActiveImage() || images[0];
        if (!reference.filters) {
            reference.filters = this.imageManager.getDefaultFilters();
        }

        const baseFilters = {
            preset: reference.filters.preset || 'custom',
            adjustments: {
                ...FILTER_DEFAULT_ADJUSTMENTS,
                ...(reference.filters.adjustments || {})
            }
        };

        images.forEach((image) => {
            if (!image.filters) {
                image.filters = this.imageManager.getDefaultFilters();
            }
            image.filters.preset = baseFilters.preset;
            image.filters.adjustments = { ...baseFilters.adjustments };
        });
    }

    updateFilterScopeUI() {
        if (!this.filterScopeButtons.length) return;
        this.filterScopeButtons.forEach((button) => {
            const isActive = button.dataset.scope === this.filterScope;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
        this.updateFilterTargetLabel();
    }

    updateFilterTargetLabel() {
        if (!this.filterTargetLabel) return;
        const images = this.imageManager.getImages();
        const total = images.length;

        if (!total) {
            this.filterTargetLabel.setAttribute('data-i18n', 'filters.targetNone');
            this.filterTargetLabel.removeAttribute('data-i18n-params');
            this.filterTargetLabel.textContent = i18n.t('filters.targetNone');
            return;
        }

        if (this.filterScope === 'all') {
            const params = { total };
            this.filterTargetLabel.setAttribute('data-i18n', 'filters.targetAll');
            this.filterTargetLabel.setAttribute('data-i18n-params', JSON.stringify(params));
            this.filterTargetLabel.textContent = i18n.t('filters.targetAll', params);
            return;
        }

        const currentIndex = this.activeImageIndex >= 0 ? this.activeImageIndex + 1 : 1;
        const params = { index: currentIndex, total };
        this.filterTargetLabel.setAttribute('data-i18n', 'filters.targetSingle');
        this.filterTargetLabel.setAttribute('data-i18n-params', JSON.stringify(params));
        this.filterTargetLabel.textContent = i18n.t('filters.targetSingle', params);
    }

    syncFilterControls() {
        if (!this.filtersSectionContent) return;
        const activeImage = this.getActiveImage();

        if (!activeImage) {
            if (this.filterEmptyMessage) this.filterEmptyMessage.style.display = '';
            this.filterBlocks.forEach(block => block.classList.add('is-disabled'));
            if (this.filterPresetContainer) this.filterPresetContainer.classList.add('is-disabled');
            if (this.filterResetBtn) this.filterResetBtn.classList.add('is-disabled');
            [this.filterBrightnessInput, this.filterContrastInput, this.filterSaturationInput, this.filterWarmthInput].forEach(input => {
                if (input) input.disabled = true;
            });
            if (this.filterBlurInput) this.filterBlurInput.disabled = true;
            this.highlightActiveFilterPreset(null);
            this.updateFilterTargetLabel();
            return;
        }

        if (this.filterEmptyMessage) this.filterEmptyMessage.style.display = 'none';
        this.filterBlocks.forEach(block => block.classList.remove('is-disabled'));
        if (this.filterPresetContainer) this.filterPresetContainer.classList.remove('is-disabled');
        if (this.filterResetBtn) this.filterResetBtn.classList.remove('is-disabled');
        [this.filterBrightnessInput, this.filterContrastInput, this.filterSaturationInput, this.filterWarmthInput].forEach(input => {
            if (input) input.disabled = false;
        });
        if (this.filterBlurInput) this.filterBlurInput.disabled = false;

        if (!activeImage.filters) {
            activeImage.filters = this.imageManager.getDefaultFilters();
        }

        activeImage.filters.adjustments = {
            ...FILTER_DEFAULT_ADJUSTMENTS,
            ...(activeImage.filters.adjustments || {})
        };

        const { adjustments, preset } = activeImage.filters;

        if (this.filterBrightnessInput) {
            this.filterBrightnessInput.value = adjustments.brightness;
            this.updateFilterSliderDisplay('brightness', adjustments.brightness);
        }
        if (this.filterContrastInput) {
            this.filterContrastInput.value = adjustments.contrast;
            this.updateFilterSliderDisplay('contrast', adjustments.contrast);
        }
        if (this.filterSaturationInput) {
            this.filterSaturationInput.value = adjustments.saturation;
            this.updateFilterSliderDisplay('saturation', adjustments.saturation);
        }
        if (this.filterWarmthInput) {
            this.filterWarmthInput.value = adjustments.warmth;
            this.updateFilterSliderDisplay('warmth', adjustments.warmth);
        }
        if (this.filterBlurInput) {
            this.filterBlurInput.value = adjustments.blur;
            this.updateFilterSliderDisplay('blur', adjustments.blur);
        }

        this.highlightActiveFilterPreset(preset);
        this.updateFilterScopeUI();
    }

    setActiveImage(index) {
        const images = this.imageManager.getImages();
        if (!images.length) {
            this.activeImageIndex = -1;
            this.syncFilterControls();
            return;
        }

        const clamped = Math.max(0, Math.min(index, images.length - 1));
        if (this.activeImageIndex === clamped) {
            return;
        }

        this.activeImageIndex = clamped;

        const imageList = document.getElementById('imageList');
        if (imageList) {
            imageList.querySelectorAll('.image-item').forEach((item) => {
                const itemIndex = parseInt(item.dataset.index, 10);
                item.classList.toggle('is-selected', itemIndex === clamped);
            });
        }

        this.syncFilterControls();
    }

    getActiveImage() {
        const images = this.imageManager.getImages();
        if (this.activeImageIndex < 0 || this.activeImageIndex >= images.length) {
            return null;
        }
        return images[this.activeImageIndex];
    }

    applyFilterPreset(presetId) {
        const images = this.imageManager.getImages();
        if (!images.length) return;
        const preset = FILTER_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        this.forEachFilterTarget((image) => {
            if (!image.filters) {
                image.filters = this.imageManager.getDefaultFilters();
            }
            image.filters.preset = preset.id;
            image.filters.adjustments = { ...preset.adjustments };
        });

        this.renderCollage();
        this.syncFilterControls();
    }

    updateFilterAdjustment(key, value) {
        const images = this.imageManager.getImages();
        if (!images.length) return;

        this.forEachFilterTarget((image) => {
            if (!image.filters) {
                image.filters = this.imageManager.getDefaultFilters();
            }
            image.filters.adjustments = {
                ...FILTER_DEFAULT_ADJUSTMENTS,
                ...(image.filters.adjustments || {})
            };
            image.filters.adjustments[key] = value;
            image.filters.preset = 'custom';
        });

        this.updateFilterSliderDisplay(key, value);
        this.highlightActiveFilterPreset(null);
        this.renderCollage();
    }

    resetFilters() {
        const images = this.imageManager.getImages();
        if (!images.length) return;

        this.forEachFilterTarget((image) => {
            image.filters = this.imageManager.getDefaultFilters();
        });
        this.renderCollage();
        this.syncFilterControls();
    }

    highlightActiveFilterPreset(presetId) {
        if (!this.filterPresetButtons || !this.filterPresetButtons.length) return;
        this.filterPresetButtons.forEach((button) => {
            const isActive = button.dataset.id === presetId;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    updateFilterSliderDisplay(key, value) {
        if (!this.filterSliderDisplays || !this.filterSliderDisplays[key]) return;
        let displayValue = `${value}%`;
        if (key === 'warmth') {
            const numeric = Number(value) || 0;
            displayValue = numeric > 0 ? `+${numeric}` : `${numeric}`;
        } else if (key === 'blur') {
            displayValue = `${value}px`;
        }
        this.filterSliderDisplays[key].textContent = displayValue;
    }

    getStickerLibrary() {
        return [
            { id: 'sparkles', emoji: '✨', labelKey: 'decorations.stickerSparkles', fallbackLabel: 'Sparkles' },
            { id: 'heart', emoji: '❤️', labelKey: 'decorations.stickerHeart', fallbackLabel: 'Heart' },
            { id: 'camera', emoji: '📷', labelKey: 'decorations.stickerCamera', fallbackLabel: 'Camera' },
            { id: 'star', emoji: '⭐', labelKey: 'decorations.stickerStar', fallbackLabel: 'Star' },
            { id: 'leaf', emoji: '🍃', labelKey: 'decorations.stickerLeaf', fallbackLabel: 'Leaf' }
        ];
    }

    addStickerDecoration(sticker) {
        const size = this.stickerSizeSelect ? this.stickerSizeSelect.value : 'medium';
        const position = this.stickerPositionSelect ? this.stickerPositionSelect.value : 'center';
        const decoration = {
            id: this.createDecorationId(),
            type: 'sticker',
            emoji: sticker.emoji,
            labelKey: sticker.labelKey,
            fallbackLabel: sticker.fallbackLabel,
            size,
            position
        };
        const coords = this.positionToCoordinates(position);
        decoration.x = coords.x;
        decoration.y = coords.y;
        this.decorations.push(decoration);
        this.activeDecorationId = decoration.id;
        this.renderCollage();
        this.renderDecorationList();
        this.syncControlsWithActiveDecoration();
    }

    handleAddTextDecoration() {
        if (!this.textInput) return;
        const content = this.textInput.value.trim();
        if (!content) {
            this.textInput.focus();
            return;
        }

        const decoration = {
            id: this.createDecorationId(),
            type: 'text',
            content,
            color: this.textColorInput ? this.textColorInput.value : '#ffffff',
            size: this.textSizeSelect ? this.textSizeSelect.value : 'medium',
            position: this.textPositionSelect ? this.textPositionSelect.value : 'center'
        };
        const coords = this.positionToCoordinates(decoration.position);
        decoration.x = coords.x;
        decoration.y = coords.y;
        this.decorations.push(decoration);
        this.activeDecorationId = decoration.id;
        this.textInput.value = '';
        this.renderCollage();
        this.renderDecorationList();
        this.syncControlsWithActiveDecoration();
    }

    renderTextSwatches() {
        const presets = this.getTextColorPresets();
        this.textSwatchRow.innerHTML = presets.map((preset) => {
            const label = i18n.t(preset.labelKey);
            return `<button type="button" class="color-swatch" data-color="${preset.value}" aria-label="${label}" title="${label}" style="background:${preset.value}"></button>`;
        }).join('');

        this.textSwatchRow.querySelectorAll('.color-swatch').forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                const color = btn.getAttribute('data-color');
                if (this.textColorInput) {
                    this.textColorInput.value = color;
                }
                this.updateActiveDecoration({ color }, ['text']);
                this.highlightActiveSwatch(color);
            });
        });

        if (this.textColorInput) {
            this.highlightActiveSwatch(this.textColorInput.value);
        }
    }

    highlightActiveSwatch(color) {
        if (!this.textSwatchRow) return;
        const normalized = color ? color.toLowerCase() : '';
        this.textSwatchRow.querySelectorAll('.color-swatch').forEach((btn) => {
            const swatchColor = (btn.getAttribute('data-color') || '').toLowerCase();
            btn.classList.toggle('is-active', swatchColor === normalized);
        });
    }

    getTextColorPresets() {
        return [
            { value: '#ffffff', labelKey: 'decorations.presetWhite' },
            { value: '#222222', labelKey: 'decorations.presetBlack' },
            { value: '#e53935', labelKey: 'decorations.presetRed' },
            { value: '#ffb300', labelKey: 'decorations.presetYellow' },
            { value: '#43a047', labelKey: 'decorations.presetGreen' }
        ];
    }

    renderDecorationList() {
        if (!this.decorationListEl) return;

        if (!this.decorations.length) {
            const emptyLabel = i18n.t('decorations.empty');
            this.decorationListEl.innerHTML = `<div class="decorate-empty">${emptyLabel}</div>`;
            return;
        }

        this.decorationListEl.innerHTML = this.decorations.map((item) => {
            const typeLabel = item.type === 'text' ? i18n.t('decorations.textHeading') : i18n.t('decorations.stickerHeading');
            const positionLabel = this.getPositionLabel(item.position);
            const content = item.type === 'text'
                ? `<span class="decorate-text-sample" style="color:${item.color || '#ffffff'};">${this.escapeHtmlContent(item.content) || i18n.t('decorations.textPlaceholder')}</span>`
                : `${item.emoji} ${this.getStickerLabel(item)}`;
            const meta = this.getDecorationSummary(item, positionLabel);
            return `
                <div class="decorate-item${item.id === this.activeDecorationId ? ' is-active' : ''}" data-id="${item.id}" data-highlight-mode="${item.type === 'text' ? 'text' : 'sticker'}">
                    <div>
                        <div class="decorate-item-type">${typeLabel}</div>
                        <div class="decorate-item-content">${content}</div>
                        <div class="decorate-item-meta">${meta}</div>
                    </div>
                    <button type="button" class="decorate-remove" data-id="${item.id}">
                        <span aria-hidden="true">✕</span>
                        <span data-i18n="decorations.remove">${i18n.t('decorations.remove')}</span>
                    </button>
                </div>
            `;
        }).join('');

        this.decorationListEl.querySelectorAll('.decorate-item').forEach((itemEl) => {
            const id = itemEl.getAttribute('data-id');
            itemEl.addEventListener('click', () => {
                this.setActiveDecoration(id);
            });
        });

        this.decorationListEl.querySelectorAll('.decorate-remove').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const id = button.getAttribute('data-id');
                this.removeDecoration(id);
            });
        });
    }

    removeDecoration(id) {
        const originalLength = this.decorations.length;
        this.decorations = this.decorations.filter((item) => item.id !== id);
        if (this.decorations.length !== originalLength) {
            if (this.activeDecorationId === id) {
                this.activeDecorationId = this.decorations.length ? this.decorations[this.decorations.length - 1].id : null;
            }
            this.renderCollage();
            this.renderDecorationList();
            this.syncControlsWithActiveDecoration();
        }
    }

    getStickerLabel(sticker) {
        try {
            return i18n.t(sticker.labelKey);
        } catch (error) {
            return sticker.fallbackLabel;
        }
    }

    escapeHtmlContent(value) {
        const span = document.createElement('span');
        span.textContent = value;
        return span.innerHTML;
    }

    positionToCoordinates(position) {
        const map = {
            'top-left': { x: 0.15, y: 0.15 },
            'top-center': { x: 0.5, y: 0.15 },
            'top-right': { x: 0.85, y: 0.15 },
            center: { x: 0.5, y: 0.5 },
            'bottom-left': { x: 0.2, y: 0.85 },
            'bottom-center': { x: 0.5, y: 0.85 },
            'bottom-right': { x: 0.85, y: 0.85 },
            custom: { x: 0.5, y: 0.5 }
        };
        return map[position] || map.center;
    }

    getDecorationSummary(item, positionLabel) {
        const sizeKey = item.size === 'large' ? 'decorations.sizeLarge'
            : item.size === 'small' ? 'decorations.sizeSmall'
            : 'decorations.sizeMedium';
        const sizeLabel = i18n.t(sizeKey);
        if (item.position === 'custom') {
            const x = this.formatPercentage(item.x);
            const y = this.formatPercentage(item.y);
            if (item.type === 'text') {
                return `${i18n.t('decorations.positionCustom')} · ${sizeLabel} · ${x}, ${y}`;
            }
            return `${i18n.t('decorations.positionCustom')} · ${sizeLabel} · ${x}, ${y}`;
        }
        if (item.type === 'text') {
            return `${positionLabel} · ${sizeLabel} · ${item.color}`;
        }
        return `${positionLabel} · ${sizeLabel}`;
    }

    getPositionLabel(position) {
        const keyMap = {
            'top-left': 'decorations.positionTopLeft',
            'top-center': 'decorations.positionTopCenter',
            'top-right': 'decorations.positionTopRight',
            center: 'decorations.positionCenter',
            'bottom-left': 'decorations.positionBottomLeft',
            'bottom-center': 'decorations.positionBottomCenter',
            'bottom-right': 'decorations.positionBottomRight'
        };
        if (position === 'custom') {
            return i18n.t('decorations.positionCustom');
        }
        const key = keyMap[position] || keyMap.center;
        try {
            return i18n.t(key);
        } catch (error) {
            return position;
        }
    }

    createDecorationId() {
        this.decorationIdCounter += 1;
        return `decor-${this.decorationIdCounter}`;
    }

    formatPercentage(value) {
        const clamped = this.clampNormalized(value || 0.5);
        return `${Math.round(clamped * 100)}%`;
    }

    updateStickerOptionLabels() {
        const stickerOptionsEl = document.getElementById('stickerOptions');
        if (!stickerOptionsEl) return;

        stickerOptionsEl.querySelectorAll('.sticker-option').forEach((button) => {
            const stickerId = button.dataset.stickerId;
            const sticker = this.stickerLibrary.find(item => item.id === stickerId);
            if (!sticker) return;
            try {
                const label = i18n.t(sticker.labelKey);
                button.setAttribute('aria-label', label);
                button.setAttribute('title', label);
            } catch (error) {
                button.setAttribute('aria-label', sticker.fallbackLabel);
                button.setAttribute('title', sticker.fallbackLabel);
            }
        });
    }

    setActiveDecoration(id) {
        if (!id) {
            this.activeDecorationId = null;
            this.syncControlsWithActiveDecoration();
            this.renderDecorationList();
            return;
        }

        const decoration = this.decorations.find((item) => item.id === id);
        if (!decoration) return;
        this.activeDecorationId = id;
        this.renderDecorationList();
        this.syncControlsWithActiveDecoration();
    }

    syncControlsWithActiveDecoration() {
        const decoration = this.decorations.find((item) => item.id === this.activeDecorationId);
        if (!decoration) {
            return;
        }

        if (decoration.type === 'text') {
            if (this.textInput) this.textInput.value = decoration.content;
            if (this.textColorInput) this.textColorInput.value = decoration.color;
            if (this.textSizeSelect) this.textSizeSelect.value = decoration.size;
            this.highlightActiveSwatch(decoration.color);
        }

        if (this.textPositionSelect) {
            this.textPositionSelect.value = decoration.position;
        }

        if (decoration.type === 'sticker') {
            if (this.stickerSizeSelect) this.stickerSizeSelect.value = decoration.size;
            if (this.stickerPositionSelect) this.stickerPositionSelect.value = decoration.position;
            this.highlightActiveSwatch(null);
        }
    }

    updateActiveDecoration(updates, allowedTypes = null) {
        if (!this.decorations.length) return;

        if (!this.activeDecorationId) {
            this.activeDecorationId = this.decorations[this.decorations.length - 1].id;
        }

        const decoration = this.decorations.find((item) => item.id === this.activeDecorationId);
        if (!decoration) return;
        if (allowedTypes && !allowedTypes.includes(decoration.type)) return;

        Object.assign(decoration, updates);
        this.ensureDecorationCoordinates(decoration);
        this.renderCollage();
        this.renderDecorationList();
        this.syncControlsWithActiveDecoration();
        if (decoration.type === 'text' && updates.color) {
            this.highlightActiveSwatch(decoration.color);
        }
    }

    setupResponsiveControls() {
        this.sidebarSections = Array.from(document.querySelectorAll('.sidebar-section'));
        this.sectionToggles = Array.from(document.querySelectorAll('.sidebar-section-toggle'));

        this.sectionToggles.forEach((toggle) => {
            toggle.addEventListener('click', () => {
                this.handleSectionToggle(toggle);
            });
        });

        const mobileNav = document.getElementById('mobileSectionNav');
        if (mobileNav) {
            this.mobileNavButtons = Array.from(mobileNav.querySelectorAll('.mobile-nav-btn'));
            this.mobileNavButtons.forEach((btn) => {
                btn.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.handleMobileNavClick(btn);
                });
            });
        }

        window.addEventListener('resize', () => this.handleResponsiveLayout());
        this.handleResponsiveLayout(true);
        this.updateMobileNavLabels();

        this.canvasExpandBtn = document.getElementById('canvasExpandBtn');
        this.canvasCloseBtn = document.getElementById('canvasCloseBtn');
        this.canvasAreaEl = document.getElementById('canvasArea');

        if (this.canvasExpandBtn) {
            this.canvasExpandBtn.addEventListener('click', () => {
                this.toggleCanvasExpanded(true);
            });
        }

        if (this.canvasCloseBtn) {
            this.canvasCloseBtn.addEventListener('click', () => {
                this.toggleCanvasExpanded(false);
            });
        }
    }

    handleResponsiveLayout(force = false) {
        const isMobile = window.innerWidth <= 768;
        const changed = force || isMobile !== this.isMobileView;
        if (!changed) {
            return;
        }

        document.body.classList.toggle('is-mobile', isMobile);

        if (isMobile) {
            this.sidebarSections.forEach((section, index) => {
                const toggle = section.querySelector('.sidebar-section-toggle');
                if (!section.dataset.mobileInitialized) {
                    section.classList.toggle('is-open', index === 0);
                    section.dataset.mobileInitialized = 'true';
                }
                if (toggle) {
                    toggle.setAttribute('aria-expanded', section.classList.contains('is-open') ? 'true' : 'false');
                }
            });

            if (this.mobileNavButtons.length) {
                this.mobileNavButtons.forEach((btn, index) => {
                    btn.classList.toggle('is-active', index === 0);
                });
            }
        } else {
            this.sidebarSections.forEach((section) => {
                section.classList.add('is-open');
                delete section.dataset.mobileInitialized;
                const toggle = section.querySelector('.sidebar-section-toggle');
                if (toggle) {
                    toggle.setAttribute('aria-expanded', 'true');
                }
            });

            if (this.mobileNavButtons.length) {
                this.mobileNavButtons.forEach((btn) => btn.classList.remove('is-active'));
            }

            if (document.body.classList.contains('is-canvas-expanded')) {
                this.toggleCanvasExpanded(false);
            }
        }

        this.isMobileView = isMobile;
    }

    handleSectionToggle(toggle) {
        const section = toggle.closest('.sidebar-section');
        if (!section) {
            return;
        }

        const isMobile = document.body.classList.contains('is-mobile');
        if (!isMobile) {
            return;
        }

        const willOpen = !section.classList.contains('is-open');

        this.sidebarSections.forEach((otherSection) => {
            if (otherSection !== section) {
                otherSection.classList.remove('is-open');
                const otherToggle = otherSection.querySelector('.sidebar-section-toggle');
                if (otherToggle) {
                    otherToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });

        section.classList.toggle('is-open', willOpen);
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }

    handleMobileNavClick(button) {
        if (!this.mobileNavButtons.length) {
            return;
        }

        this.mobileNavButtons.forEach((btn) => {
            btn.classList.toggle('is-active', btn === button);
        });

        const targetId = button.dataset.target;
        if (!targetId) {
            return;
        }

        const target = document.getElementById(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (document.body.classList.contains('is-mobile')) {
            const section = document.getElementById(targetId);
            if (section && section.classList.contains('sidebar-section')) {
                this.sidebarSections.forEach((otherSection) => {
                    const otherToggle = otherSection.querySelector('.sidebar-section-toggle');
                    const isTarget = otherSection === section;
                    otherSection.classList.toggle('is-open', isTarget);
                    if (otherToggle) {
                        otherToggle.setAttribute('aria-expanded', isTarget ? 'true' : 'false');
                    }
                });
            }

            if (targetId === 'canvasArea' && this.canvasExpandBtn) {
                this.toggleCanvasExpanded(true);
            }
        }
    }

    updateMobileNavLabels() {
        if (!this.mobileNavButtons.length) {
            return;
        }

        this.mobileNavButtons.forEach((btn) => {
            const key = btn.getAttribute('data-i18n');
            if (key) {
                const label = i18n.t(key);
                btn.textContent = label;
                btn.setAttribute('aria-label', label);
            }
        });
    }

    toggleCanvasExpanded(force) {
        const shouldExpand = typeof force === 'boolean' ? force : !document.body.classList.contains('is-canvas-expanded');
        if (!this.canvasAreaEl) {
            return;
        }

        document.body.classList.toggle('is-canvas-expanded', shouldExpand);
        if (shouldExpand && this.canvasAreaEl) {
            this.canvasAreaEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (this.isMobileView && this.mobileNavButtons.length) {
                this.mobileNavButtons.forEach((btn) => {
                    btn.classList.toggle('is-active', btn.dataset.target === 'canvasArea');
                });
            }
            document.addEventListener('keyup', this.handleCanvasKeyUp);
        } else {
            document.removeEventListener('keyup', this.handleCanvasKeyUp);
        }
    }

    handleCanvasKeyUp(event) {
        if (event.key === 'Escape' && document.body.classList.contains('is-canvas-expanded')) {
            this.toggleCanvasExpanded(false);
        }
    }

    bindDecorationOverlayEvents() {
        const container = document.getElementById('collageCanvas');
        if (!container) return;
        const overlayItems = container.querySelectorAll('.collage-overlay .overlay-item');
        overlayItems.forEach((item) => {
            if (item.dataset.dragBound === 'true') return;
            item.dataset.dragBound = 'true';
            item.addEventListener('pointerdown', (event) => this.startDecorationDrag(event, container, item));
        });
    }

    startDecorationDrag(event, container, element) {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const id = element.dataset.id;
        const decoration = this.decorations.find((item) => item.id === id);
        if (!decoration) return;

        this.setActiveDecoration(id);
        this.ensureDecorationCoordinates(decoration);

        element.setPointerCapture(event.pointerId);
        element.classList.add('is-dragging');
        this.dragState = {
            pointerId: event.pointerId,
            element,
            decoration,
            container
        };

        element.addEventListener('pointermove', this.handleDecorationPointerMove);
        element.addEventListener('pointerup', this.handleDecorationPointerUp);
        element.addEventListener('pointercancel', this.handleDecorationPointerUp);
    }

    handleDecorationPointerMove(event) {
        if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
        const { container, element, decoration } = this.dragState;
        
        // Cache rect to avoid repeated getBoundingClientRect calls
        if (!this.dragState.cachedRect) {
            this.dragState.cachedRect = container.getBoundingClientRect();
        }
        const rect = this.dragState.cachedRect;
        
        if (!rect.width || !rect.height) return;

        // Use requestAnimationFrame to batch DOM updates
        if (this.dragState.rafId) {
            cancelAnimationFrame(this.dragState.rafId);
        }
        
        this.dragState.rafId = requestAnimationFrame(() => {
            const newX = this.clampNormalized((event.clientX - rect.left) / rect.width);
            const newY = this.clampNormalized((event.clientY - rect.top) / rect.height);

            decoration.x = newX;
            decoration.y = newY;
            decoration.position = 'custom';

            element.style.left = `${newX * 100}%`;
            element.style.top = `${newY * 100}%`;
        });
    }

    handleDecorationPointerUp(event) {
        if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
        const { element } = this.dragState;

        // Cancel any pending animation frame
        if (this.dragState.rafId) {
            cancelAnimationFrame(this.dragState.rafId);
            this.dragState.rafId = null;
        }

        element.releasePointerCapture(event.pointerId);
        element.classList.remove('is-dragging');
        element.removeEventListener('pointermove', this.handleDecorationPointerMove);
        element.removeEventListener('pointerup', this.handleDecorationPointerUp);
        element.removeEventListener('pointercancel', this.handleDecorationPointerUp);

        this.dragState = null;
        this.renderDecorationList();
        this.syncControlsWithActiveDecoration();
        this.renderCollage();
    }

    ensureDecorationCoordinates(decoration) {
        if (typeof decoration.x !== 'number' || Number.isNaN(decoration.x) || typeof decoration.y !== 'number' || Number.isNaN(decoration.y)) {
            const coords = this.positionToCoordinates(decoration.position);
            decoration.x = coords.x;
            decoration.y = coords.y;
        }
        decoration.x = this.clampNormalized(decoration.x);
        decoration.y = this.clampNormalized(decoration.y);
    }

    clampNormalized(value) {
        if (!Number.isFinite(value)) return 0.5;
        const min = 0.05;
        const max = 0.95;
        return Math.min(Math.max(value, min), max);
    }

    nudgeImagePosition(index, direction) {
         const images = this.imageManager.getImages();
         if (!images.length) return;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= images.length) {
            return;
        }
        const placeAfter = direction > 0;
        this.moveImage(index, targetIndex, placeAfter);
    }

    moveImage(fromIndex, targetIndex, placeAfter = false) {
        const images = this.imageManager.getImages();
        const total = images.length;
        if (!total) return;
        if (fromIndex < 0 || fromIndex >= total) return;
        if (targetIndex < 0) targetIndex = 0;
        if (targetIndex >= total) targetIndex = total - 1;

        const activeImageRef = this.activeImageIndex >= 0 ? images[this.activeImageIndex] : null;
        const movedImageRef = images[fromIndex];

        const newIndex = this.imageManager.reorderImages(fromIndex, targetIndex, { insertAfter: placeAfter });
        if (newIndex === false) {
            return;
        }

        const updatedImages = this.imageManager.getImages();
        if (activeImageRef) {
            const newActiveIndex = updatedImages.indexOf(activeImageRef);
            this.activeImageIndex = newActiveIndex;
        }

        if (!activeImageRef && movedImageRef) {
            const movedIndex = updatedImages.indexOf(movedImageRef);
            if (movedIndex >= 0) {
                this.activeImageIndex = movedIndex;
            }
        }

        this.updateImageList();
        this.renderCollage();
        this.updateFilterTargetLabel();
    }

    handleImageDragStart(event) {
        const item = event.currentTarget;
        const index = parseInt(item.dataset.index, 10);
        if (Number.isNaN(index)) return;
        this.imageDragState = {
            fromIndex: index,
            sourceEl: item
        };
        item.classList.add('is-dragging');
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(index));
        }
    }

    handleImageDragEnter(event) {
        if (!this.imageDragState) return;
        const target = event.currentTarget;
        if (target === this.imageDragState.sourceEl) return;
        this.clearImageDragHover();
        target.classList.add('is-drag-over');
        this.imageDragState.hoverEl = target;
    }

    handleImageDragOver(event) {
        if (!this.imageDragState) return;
        const target = event.currentTarget;
        if (target === this.imageDragState.sourceEl) return;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
        const rect = target.getBoundingClientRect();
        const isAfter = event.clientY > rect.top + rect.height / 2;
        target.classList.toggle('drop-after', isAfter);
        target.classList.toggle('drop-before', !isAfter);
        target.dataset.dropPosition = isAfter ? 'after' : 'before';
    }

    handleImageDragLeave(event) {
        if (!this.imageDragState) return;
        const target = event.currentTarget;
        target.classList.remove('is-drag-over', 'drop-before', 'drop-after');
        if (this.imageDragState && this.imageDragState.hoverEl === target) {
            delete this.imageDragState.hoverEl;
        }
    }

    handleImageDrop(event) {
        if (!this.imageDragState) return;
        event.preventDefault();
        const target = event.currentTarget;
        const fromIndex = this.imageDragState.fromIndex;
        let targetIndex = parseInt(target.dataset.index, 10);
        if (Number.isNaN(fromIndex) || Number.isNaN(targetIndex)) {
            this.handleImageDragEnd();
            return;
        }

        const placeAfter = target.dataset.dropPosition === 'after';
        this.clearImageDragHover();
        this.moveImage(fromIndex, targetIndex, placeAfter);
        this.handleImageDragEnd();
    }

    handleImageDragEnd() {
        if (this.imageDragState && this.imageDragState.sourceEl) {
            this.imageDragState.sourceEl.classList.remove('is-dragging');
        }
        this.clearImageDragHover();
        this.imageDragState = null;
    }

    clearImageDragHover() {
        const list = document.getElementById('imageList');
        if (!list) return;
        list.querySelectorAll('.image-item').forEach((item) => {
            item.classList.remove('is-drag-over', 'drop-before', 'drop-after', 'is-dragging');
            delete item.dataset.dropPosition;
        });
    }
}

// Initialize app when DOM is ready
// WebP detection is now done in <head> script to avoid loading PNG images
document.addEventListener('DOMContentLoaded', () => {
    // Ensure background image is set (in case head script ran before DOM)
    const bgElement = document.querySelector('.ghibli-background');
    if (bgElement && !bgElement.style.backgroundImage) {
        const isWebP = document.documentElement.classList.contains('webp-supported');
        bgElement.style.backgroundImage = isWebP ? 'url(/wallImage.webp)' : 'url(/wallImage.png)';
    }
    
    // Initialize i18n first, then app
    i18n.init();
    new App();
});

