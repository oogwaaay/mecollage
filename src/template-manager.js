// Template management
import { i18n } from './i18n.js';

const TEMPLATE_CATEGORIES = [
    { key: 'all', nameKey: 'templates.categories.all' },
    { key: 'basics', nameKey: 'templates.categories.basics' },
    { key: 'gallery', nameKey: 'templates.categories.gallery' },
    { key: 'showcase', nameKey: 'templates.categories.showcase' },
    { key: 'story', nameKey: 'templates.categories.story' },
    { key: 'panorama', nameKey: 'templates.categories.panorama' },
];

const THEME_GROUPS = [
    { key: 'all', nameKey: 'templates.themes.all.name', descriptionKey: 'templates.themes.all.description', accentClass: 'theme-all' },
    { key: 'holiday', nameKey: 'templates.themes.holiday.name', descriptionKey: 'templates.themes.holiday.description', accentClass: 'theme-holiday' },
    { key: 'commerce', nameKey: 'templates.themes.commerce.name', descriptionKey: 'templates.themes.commerce.description', accentClass: 'theme-commerce' },
    { key: 'travel', nameKey: 'templates.themes.travel.name', descriptionKey: 'templates.themes.travel.description', accentClass: 'theme-travel' },
    { key: 'photography', nameKey: 'templates.themes.photography.name', descriptionKey: 'templates.themes.photography.description', accentClass: 'theme-photography' },
    { key: 'social', nameKey: 'templates.themes.social.name', descriptionKey: 'templates.themes.social.description', accentClass: 'theme-social' },
    { key: 'family', nameKey: 'templates.themes.family.name', descriptionKey: 'templates.themes.family.description', accentClass: 'theme-family' },
];

const FAVORITES_STORAGE_KEY = 'mecollage_template_favorites';
const LEGACY_FAVORITES_STORAGE_KEY = 'picstitch_template_favorites';

export class TemplateManager {
    constructor() {
        this.templates = [
            { key: 'horizontal', type: 'horizontal', icon: '↔️', category: 'basics', themes: ['travel'] },
            { key: 'vertical', type: 'vertical', icon: '↕️', category: 'basics', themes: ['photography'] },
            { key: 'twoColumns', type: 'twoColumns', category: 'basics', themes: ['commerce'] },
            { key: 'asymmetric', type: 'asymmetric', category: 'showcase', themes: ['commerce', 'social'] },
            { key: 'featured', type: 'featured', category: 'showcase', themes: ['holiday', 'photography', 'social'] },
            { key: 'grid2x2', type: 'grid', rows: 2, cols: 2, category: 'gallery', themes: ['holiday'] },
            { key: 'grid3x3', type: 'grid', rows: 3, cols: 3, category: 'gallery', themes: ['holiday', 'social'] },
            { key: 'grid4x4', type: 'grid', rows: 4, cols: 4, category: 'gallery', themes: ['holiday', 'social'] },
            { key: 'grid5x4', type: 'grid', rows: 5, cols: 4, category: 'gallery', themes: ['commerce', 'family'] },
            { key: 'grid4x5', type: 'grid', rows: 4, cols: 5, category: 'story', themes: ['family'] },
            { key: 'grid6x4', type: 'grid', rows: 6, cols: 4, category: 'story', themes: ['travel', 'family'] },
            { key: 'grid4x6', type: 'grid', rows: 4, cols: 6, category: 'panorama', themes: ['travel', 'commerce'] },
            { key: 'grid5x5', type: 'grid', rows: 5, cols: 5, category: 'gallery', themes: ['travel', 'photography'] },
            { key: 'grid6x5', type: 'grid', rows: 6, cols: 5, category: 'story', themes: ['family'] },
            { key: 'grid5x6', type: 'grid', rows: 5, cols: 6, category: 'panorama', themes: ['travel', 'family'] },
            { key: 'grid7x3', type: 'grid', rows: 7, cols: 3, category: 'story', themes: ['commerce'] },
            { key: 'grid3x7', type: 'grid', rows: 3, cols: 7, category: 'panorama', themes: ['commerce'] },
            { key: 'grid8x3', type: 'grid', rows: 8, cols: 3, category: 'story', themes: ['photography'] },
            { key: 'grid3x8', type: 'grid', rows: 3, cols: 8, category: 'panorama', themes: ['photography'] },
            { key: 'grid10x2', type: 'grid', rows: 10, cols: 2, category: 'story', themes: ['social'] },
            { key: 'grid2x10', type: 'grid', rows: 2, cols: 10, category: 'panorama', themes: ['travel'] },
            { key: 'grid10x3', type: 'grid', rows: 10, cols: 3, category: 'story', themes: ['social'] },
            { key: 'grid3x10', type: 'grid', rows: 3, cols: 10, category: 'panorama', themes: ['social'] },
            { key: 'grid20x1', type: 'grid', rows: 20, cols: 1, category: 'story', themes: ['family'] },
            { key: 'grid1x20', type: 'grid', rows: 1, cols: 20, category: 'panorama', themes: ['holiday'] },
        ].map((template, index) => ({ ...template, originalIndex: index }));

        this.templateMap = new Map(this.templates.map(template => [template.key, template]));
        this.categories = TEMPLATE_CATEGORIES;
        this.categorySet = new Set(this.categories.map(category => category.key));
        this.selectedCategory = 'all';
        this.themeGroups = THEME_GROUPS;
        this.themeGroupMap = new Map(this.themeGroups.map(theme => [theme.key, theme]));
        this.themeContainer = null;
        this.selectedTheme = 'all';
        this.categoryContainer = null;
        this.recommendedKeys = [];
        this.activeKey = null;
        this.displayTemplates = [...this.templates];
        this.templateGridElement = null;
        this.favorites = new Set();
        this.recommendationDetails = new Map();
        this.visibleRecommended = [];
        this.currentImageCount = 0;
        this.textRefreshCallbacks = new Map();
    }

    renderCategories() {
        const container = document.getElementById('templateCategories');
        if (!container) return;

        container.innerHTML = this.categories.map(category => `
            <button class="template-category${category.key === this.selectedCategory ? ' active' : ''}" data-key="${category.key}">
                ${i18n.t(category.nameKey)}
            </button>
        `).join('');

        this.categoryContainer = container;

        container.querySelectorAll('.template-category').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-key');
                this.setCategory(key);
            });
        });
    }

    renderThemeNavigator() {
        const container = document.getElementById('templateThemes');
        if (!container) return;

        const chipsMarkup = this.themeGroups.map(theme => {
            const isActive = this.selectedTheme === theme.key || (this.selectedTheme === 'all' && theme.key === 'all');
            const accentClass = theme.accentClass ? ` ${theme.accentClass}` : '';
            const name = this.escapeHtml(i18n.t(theme.nameKey));
            const description = this.escapeHtml(i18n.t(theme.descriptionKey));
            return `
                <button class="theme-chip${accentClass}${isActive ? ' active' : ''}" data-key="${theme.key}" aria-pressed="${isActive}">
                    <span class="theme-chip-name">${name}</span>
                    <span class="theme-chip-desc">${description}</span>
                </button>
            `;
        }).join('');

        container.innerHTML = `<div class="template-theme-row">${chipsMarkup}</div>`;
        this.themeContainer = container;

        container.querySelectorAll('.theme-chip').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-key');
                this.setTheme(key);
            });
        });

        this.updateThemeState();
    }

    setCategory(key) {
        if (!this.categorySet.has(key) || this.selectedCategory === key) return;
        this.selectedCategory = key;

        if (this.selectedTheme !== 'all') {
            this.selectedTheme = 'all';
            this.renderThemeNavigator();
        }

        this.renderCategories();
        this.renderTemplates();

        if (!this.displayTemplates.some(template => template.key === this.activeKey)) {
            this.activeKey = null;
            this.updateActiveState();
        }
    }

    setTheme(key) {
        const normalizedKey = this.themeGroupMap.has(key) ? key : 'all';

        if (this.selectedTheme === normalizedKey) {
            if (normalizedKey === 'all') {
                return;
            }
            this.selectedTheme = 'all';
        } else {
            this.selectedTheme = normalizedKey;
        }

        if (this.selectedTheme !== 'all' && this.selectedCategory !== 'all') {
            this.selectedCategory = 'all';
            this.renderCategories();
        }

        this.renderThemeNavigator();
        this.renderTemplates();
    }

    renderTemplates() {
        const templateGrid = document.getElementById('templateGrid');
        if (!templateGrid) return;

        this.recommendationDetails = new Map();
        this.recommendedKeys.forEach(key => {
            const template = this.templateMap.get(key);
            if (template) {
                const detail = this.buildRecommendationDetail(template, this.currentImageCount);
                if (detail) {
                    this.recommendationDetails.set(key, detail);
                }
            }
        });

        const filteredTemplates = this.templates.filter(template => {
            return this.selectedCategory === 'all' || template.category === this.selectedCategory;
        });

        const filteredSet = new Set(filteredTemplates.map(template => template.key));

        const themeFiltered = this.selectedTheme === 'all'
            ? filteredTemplates
            : filteredTemplates.filter(template => Array.isArray(template.themes) && template.themes.includes(this.selectedTheme));

        const themeFilteredSet = new Set(themeFiltered.map(template => template.key));

        const recommendedList = this.recommendedKeys
            .map(key => this.templateMap.get(key))
            .filter(template => template && filteredSet.has(template.key) && themeFilteredSet.has(template.key));

        const recommendedSet = new Set(recommendedList.map(template => template.key));
        this.visibleRecommended = recommendedList;

        const others = themeFiltered
            .filter(template => !recommendedSet.has(template.key))
            .sort((a, b) => a.originalIndex - b.originalIndex);

        const favoriteList = others.filter(template => this.favorites.has(template.key));
        const nonFavoriteList = others.filter(template => !this.favorites.has(template.key));

        this.displayTemplates = [...recommendedList, ...favoriteList, ...nonFavoriteList];

        templateGrid.innerHTML = this.displayTemplates.map((template) => {
            const isActive = template.key === this.activeKey;
            const isRecommended = recommendedSet.has(template.key);
            const isFavorite = this.favorites.has(template.key);
            const favoriteLabelKey = isFavorite ? 'templates.favorite.remove' : 'templates.favorite.add';
            const favoriteLabel = this.escapeHtml(i18n.t(favoriteLabelKey));
            const detail = this.recommendationDetails.get(template.key);
            const insightTags = detail ? this.getInsightTagsMarkup(detail) : '';
            const visualMarkup = this.getVisualMarkup(template);
            return `
                <div class="template-item${isActive ? ' active' : ''}${isRecommended ? ' recommended' : ''}${isFavorite ? ' favorite' : ''}" data-key="${template.key}">
                    <button class="template-favorite-btn${isFavorite ? ' is-favorite' : ''}" data-key="${template.key}" aria-label="${favoriteLabel}" aria-pressed="${isFavorite}" title="${favoriteLabel}"></button>
                    ${visualMarkup}
                    <div class="template-name" data-template-key="${template.key}" data-i18n="templates.${template.key}">${i18n.t(`templates.${template.key}`)}</div>
                    ${insightTags}
                    ${this.getThemeTagsMarkup(template)}
                </div>
            `;
        }).join('');

        this.templateGridElement = templateGrid;

        templateGrid.querySelectorAll('.template-item').forEach((item) => {
            const key = item.getAttribute('data-key');
            item.addEventListener('click', () => {
                this.activateTemplate(key, { dispatch: true, auto: false });
            });
        });

        templateGrid.querySelectorAll('.template-favorite-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const key = button.getAttribute('data-key');
                this.toggleFavorite(key);
            });
        });

        this.updateActiveState();
        this.updateThemeState();
        this.renderRecommendationSummary();
        this.refreshTemplateTexts();
    }

    getTemplate(index) {
        return this.templates[index];
    }

    activateTemplate(key, { dispatch = false, auto = false, forceDispatch = false } = {}) {
        const template = this.templateMap.get(key);
        if (!template) return false;
        const previousKey = this.activeKey;
        this.activeKey = key;
        this.updateActiveState();

        if (dispatch && (forceDispatch || previousKey !== key)) {
            const { originalIndex, ...payload } = template;
            document.dispatchEvent(new CustomEvent('template-selected', {
                detail: {
                    template: { ...payload },
                    auto
                }
            }));
        }

        return true;
    }

    ensureActiveTemplate({ dispatch = false, force = false } = {}) {
        let targetKey = null;

        if (this.activeKey && this.templateMap.has(this.activeKey)) {
            targetKey = this.activeKey;
        }

        if (!targetKey && this.recommendedKeys.length) {
            targetKey = this.recommendedKeys.find(key => this.templateMap.has(key)) || null;
        }

        if (!targetKey && this.displayTemplates.length) {
            targetKey = this.displayTemplates[0].key;
        }

        if (!targetKey && this.templates.length) {
            targetKey = this.templates[0].key;
        }

        if (!targetKey) {
            return false;
        }

        return this.activateTemplate(targetKey, { dispatch, auto: true, forceDispatch: force });
    }

    getActiveTemplatePayload() {
        if (!this.activeKey) return null;
        const template = this.templateMap.get(this.activeKey);
        if (!template) return null;
        const { originalIndex, ...payload } = template;
        return { ...payload, key: template.key };
    }

    getRecommendedKeys() {
        return Array.isArray(this.recommendedKeys) ? [...this.recommendedKeys] : [];
    }

    getDefaultTemplateKey() {
        return this.templates.length ? this.templates[0].key : null;
    }

    getActiveTemplateKey() {
        return this.activeKey || null;
    }

    refreshTemplateTexts() {
        const templateGrid = document.getElementById('templateGrid');
        if (!templateGrid) return;

        templateGrid.querySelectorAll('[data-template-key]').forEach((el) => {
            const key = el.getAttribute('data-template-key');
            if (!key) return;
            try {
                el.textContent = i18n.t(`templates.${key}`);
            } catch (error) {
                // ignore missing translation
            }
        });

        templateGrid.querySelectorAll('[data-theme-key]').forEach((el) => {
            const key = el.getAttribute('data-theme-key');
            if (!key) return;
            const theme = this.themeGroupMap.get(key);
            if (!theme) return;
            try {
                el.textContent = i18n.t(theme.nameKey);
            } catch (error) {
                // ignore missing translation
            }
        });
    }

    updateActiveState() {
        if (!this.templateGridElement) return;
        this.templateGridElement.querySelectorAll('.template-item').forEach((item) => {
            const key = item.getAttribute('data-key');
            item.classList.toggle('active', key === this.activeKey);
            item.classList.toggle('favorite', this.favorites.has(key));

            const favoriteBtn = item.querySelector('.template-favorite-btn');
            if (favoriteBtn) {
                const isFavorite = this.favorites.has(key);
                favoriteBtn.classList.toggle('is-favorite', isFavorite);
                favoriteBtn.setAttribute('aria-pressed', String(isFavorite));
                try {
                    const label = i18n.t(isFavorite ? 'templates.favorite.remove' : 'templates.favorite.add');
                    favoriteBtn.setAttribute('aria-label', label);
                    favoriteBtn.setAttribute('title', label);
                } catch (error) {
                    // ignore missing translation
                }
            }
        });
    }

    updateThemeState() {
        if (!this.themeContainer) return;
        this.themeContainer.querySelectorAll('.theme-chip').forEach((chip) => {
            const key = chip.getAttribute('data-key');
            const isActive = this.selectedTheme === key || (this.selectedTheme === 'all' && key === 'all');
            chip.classList.toggle('active', isActive);
            chip.setAttribute('aria-pressed', String(isActive));
        });
    }

    updateRecommendations(imageCount) {
        this.currentImageCount = imageCount;
        this.recommendedKeys = this.getRecommendationKeys(imageCount);
        this.renderTemplates();
    }

    getRecommendationKeys(count) {
        if (count <= 0) return [];
        if (count === 1) return ['horizontal', 'vertical', 'featured'];
        if (count === 2) return ['horizontal', 'vertical', 'twoColumns'];
        if (count <= 4) return ['grid2x2', 'twoColumns', 'featured'];
        if (count <= 6) return ['grid3x3', 'asymmetric', 'twoColumns'];
        if (count <= 9) return ['grid3x3', 'grid4x4', 'featured'];
        if (count <= 12) return ['grid4x4', 'grid5x4', 'grid4x5'];
        if (count <= 16) return ['grid5x4', 'grid4x6', 'grid5x5'];
        if (count <= 20) return ['grid5x5', 'grid6x4', 'grid4x6', 'grid7x3', 'grid3x7'];
        return ['grid5x6', 'grid6x5', 'grid20x1', 'grid1x20'];
    }

    autoSelectFirstRecommendation() {
        if (!this.displayTemplates.length) return false;
        const recommended = this.displayTemplates.find(template => this.recommendedKeys.includes(template.key));
        const fallback = recommended || this.displayTemplates[0];
        if (!fallback) return false;
        return this.activateTemplate(fallback.key, { dispatch: true, auto: true });
    }

    getTemplateByKey(key) {
        const template = this.templateMap.get(key);
        if (!template) return null;
        const { originalIndex, ...payload } = template;
        return { ...payload };
    }

    clearActiveSelection() {
        this.activeKey = null;
        this.updateActiveState();
    }

    getThemeTagsMarkup(template) {
        if (!template.themes || !template.themes.length) return '';
        const visibleThemes = template.themes.slice(0, 2);

        const tagsMarkup = visibleThemes.map(themeKey => {
            const theme = this.themeGroupMap.get(themeKey);
            if (!theme) return '';
            const name = this.escapeHtml(i18n.t(theme.nameKey));
            const accentClass = theme.accentClass ? ` ${theme.accentClass}` : '';
            return `<span class="template-tag${accentClass}" data-theme-key="${themeKey}" data-i18n="${theme.nameKey}">${name}</span>`;
        }).join('');

        return `<div class="template-tags">${tagsMarkup}</div>`;
    }

    getInsightTagsMarkup(detail) {
        if (!detail || !detail.tags || !detail.tags.length) return '';
        return `<div class="insight-tags">
            ${detail.tags.map(tag => `<span class="insight-tag${tag.className ? ` ${tag.className}` : ''}">${this.escapeHtml(tag.label)}</span>`).join('')}
        </div>`;
    }

    buildRecommendationDetail(template, imageCount) {
        if (!template || imageCount <= 0) return null;

        const detail = {
            tags: [],
            lines: []
        };

        if (template.type === 'grid') {
            const rows = template.rows || 1;
            const cols = template.cols || 1;
            const capacity = rows * cols;
            const fitsExactly = capacity === imageCount;
            const fitsComfortably = capacity >= imageCount;
            const extra = Math.abs(capacity - imageCount);

            if (fitsExactly) {
                detail.tags.push({
                    label: i18n.t('templates.recommendations.tags.exactFit', { count: imageCount }),
                    className: 'tag-fit'
                });
                detail.lines.push(i18n.t('templates.recommendations.tooltip.gridExact', { count: imageCount }));
            } else if (fitsComfortably) {
                detail.tags.push({
                    label: i18n.t('templates.recommendations.tags.fitsUpTo', { count: capacity }),
                    className: 'tag-fit'
                });
                detail.lines.push(i18n.t('templates.recommendations.tooltip.gridCapacity', { count: imageCount, capacity }));
                if (extra > 0) {
                    detail.lines.push(i18n.t('templates.recommendations.tooltip.gridExtra', { extra }));
                }
            } else {
                detail.tags.push({
                    label: i18n.t('templates.recommendations.tags.expandsTo', { count: capacity }),
                    className: 'tag-fit'
                });
                detail.lines.push(i18n.t('templates.recommendations.tooltip.gridOverflow', { count: imageCount, capacity }));
                if (extra > 0) {
                    detail.lines.push(i18n.t('templates.recommendations.tooltip.gridNeedMore', { missing: extra }));
                }
            }
        }

        const orientation = this.getGridOrientation(rows, cols);
        detail.tags.push({
            label: i18n.t(`templates.recommendations.tags.${orientation}`, { rows, cols }),
            className: 'tag-orientation'
        });

        if (template.type === 'horizontal') {
            detail.tags.push({ label: i18n.t('templates.recommendations.tags.landscape'), className: 'tag-orientation' });
            detail.tags.push({ label: i18n.t('templates.recommendations.tags.hero'), className: 'tag-style' });
            detail.lines.push(i18n.t('templates.recommendations.tooltip.horizontalPrimary', { count: imageCount }));
            detail.lines.push(i18n.t('templates.recommendations.tooltip.horizontalSecondary'));
        }

        if (template.type === 'vertical') {
            detail.tags.push({ label: i18n.t('templates.recommendations.tags.portrait'), className: 'tag-orientation' });
            detail.tags.push({ label: i18n.t('templates.recommendations.tags.story'), className: 'tag-style' });
            detail.lines.push(i18n.t('templates.recommendations.tooltip.verticalPrimary', { count: imageCount }));
            detail.lines.push(i18n.t('templates.recommendations.tooltip.verticalSecondary'));
        }

        if (template.type === 'twoColumns') {
            detail.tags.push({ label: i18n.t('templates.recommendations.tags.twoColumn'), className: 'tag-style' });
            detail.lines.push(i18n.t('templates.recommendations.tooltip.twoColumnsPrimary'));
            detail.lines.push(i18n.t('templates.recommendations.tooltip.twoColumnsSecondary'));
        }

        if (template.type === 'asymmetric') {
            detail.tags.push({ label: i18n.t('templates.recommendations.tags.collage'), className: 'tag-style' });
            detail.lines.push(i18n.t('templates.recommendations.tooltip.asymmetricPrimary'));
            detail.lines.push(i18n.t('templates.recommendations.tooltip.asymmetricSecondary'));
        }

        if (template.type === 'featured') {
            detail.tags.push({ label: i18n.t('templates.recommendations.tags.featured'), className: 'tag-style' });
            detail.lines.push(i18n.t('templates.recommendations.tooltip.featuredPrimary'));
            detail.lines.push(i18n.t('templates.recommendations.tooltip.featuredSecondary'));
        }

        return detail;
    }

    getGridOrientation(rows, cols) {
        if (rows === cols) return 'square';
        if (rows > cols) return 'portrait';
        return 'landscape';
    }

    renderRecommendationSummary() {
        const summaryEl = document.getElementById('recommendationSummary');
        if (!summaryEl) return;

        if (!this.visibleRecommended.length || this.currentImageCount <= 0) {
            summaryEl.classList.add('is-hidden');
            summaryEl.innerHTML = '';
            return;
        }

        const primaryTemplate = this.visibleRecommended[0];
        const detail = this.recommendationDetails.get(primaryTemplate.key);
        if (!detail) {
            summaryEl.classList.add('is-hidden');
            summaryEl.innerHTML = '';
            return;
        }

        const templateName = this.escapeHtml(i18n.t(`templates.${primaryTemplate.key}`));
        const tags = detail.tags ? detail.tags.slice(0, 3) : [];
        const tagMarkup = tags.map(tag => `<span class="summary-tag">${this.escapeHtml(tag.label)}</span>`).join('');
        const photoLabelKey = this.currentImageCount === 1 ? 'templates.recommendations.photo.single' : 'templates.recommendations.photo.plural';
        const photoLabel = i18n.t(photoLabelKey);
        const subtitle = this.escapeHtml(i18n.t('templates.recommendations.subtitle', { count: this.currentImageCount, photoLabel }));
        const note = detail.lines?.[0] ? `<div class="summary-note">${this.escapeHtml(detail.lines[0])}</div>` : '';

        summaryEl.innerHTML = `
            <div class="summary-heading">${i18n.t('templates.recommendations.heading')}</div>
            <div class="summary-subtitle">${subtitle} <span class="summary-template">${templateName}</span></div>
            ${tagMarkup ? `<div class="summary-tags">${tagMarkup}</div>` : ''}
            ${note}
        `;
        summaryEl.classList.remove('is-hidden');
    }

    getBestTemplateKeyForCount(count) {
        if (this.recommendedKeys.length) {
            const best = this.recommendedKeys.find(key => this.templateMap.has(key));
            if (best) return best;
        }

        let bestTemplate = null;
        let bestScore = Infinity;

        this.templates.forEach(template => {
            if (template.type !== 'grid') return;
            const capacity = template.rows * template.cols;
            if (capacity < count) return;
            const score = capacity - count;
            if (score < bestScore) {
                bestScore = score;
                bestTemplate = template;
            } else if (score === bestScore && bestTemplate) {
                if (template.rows * template.cols < bestTemplate.rows * bestTemplate.cols) {
                    bestTemplate = template;
                }
            }
        });

        return bestTemplate ? bestTemplate.key : null;
    }

    toggleFavorite(key) {
        if (!this.templateMap.has(key)) return;
        if (this.favorites.has(key)) {
            this.favorites.delete(key);
        } else {
            this.favorites.add(key);
        }

        this.persistFavorites();
        this.renderTemplates();
    }

    loadFavorites() {
        if (typeof window === 'undefined' || !window.localStorage) {
            this.favorites = new Set();
            return;
        }

        try {
            let stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (!stored) {
                const legacy = window.localStorage.getItem(LEGACY_FAVORITES_STORAGE_KEY);
                if (legacy) {
                    stored = legacy;
                    window.localStorage.setItem(FAVORITES_STORAGE_KEY, legacy);
                    window.localStorage.removeItem(LEGACY_FAVORITES_STORAGE_KEY);
                }
            }
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    this.favorites = new Set(parsed.filter(key => this.templateMap.has(key)));
                }
            }
        } catch (error) {
            console.warn('Failed to load template favorites', error);
            this.favorites = new Set();
        }
    }

    persistFavorites() {
        if (typeof window === 'undefined' || !window.localStorage) return;

        try {
            const serialized = JSON.stringify([...this.favorites]);
            window.localStorage.setItem(FAVORITES_STORAGE_KEY, serialized);
            window.localStorage.removeItem(LEGACY_FAVORITES_STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to persist template favorites', error);
        }
    }

    escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, (char) => {
            switch (char) {
                case '&':
                    return '&amp;';
                case '<':
                    return '&lt;';
                case '>':
                    return '&gt;';
                case '"':
                    return '&quot;';
                case '\'':
                    return '&#39;';
                default:
                    return char;
            }
        });
    }

    getVisualMarkup(template) {
        if (template.type === 'grid' && template.rows && template.cols) {
            return `<div class="template-icon">${this.buildUniformIcon(template.rows, template.cols)}</div>`;
        }

        if (template.type === 'horizontal' || template.type === 'vertical') {
            return `<div class="template-icon">${this.getIconMarkup(template)}</div>`;
        }

        if (template.type === 'twoColumns') {
            return this.buildCustomIcon('repeat(2, 1fr)', '1fr', [
                'grid-column: 1; grid-row: 1;',
                'grid-column: 2; grid-row: 1;'
            ], 'two-columns');
        }

        if (template.type === 'asymmetric') {
            return this.buildCustomIcon('2.5fr 1fr', 'repeat(2, 1fr)', [
                'grid-column: 1; grid-row: 1 / span 2;',
                'grid-column: 2; grid-row: 1;',
                'grid-column: 2; grid-row: 2;'
            ], 'asymmetric');
        }

        if (template.type === 'featured') {
            return this.buildCustomIcon('repeat(4, 1fr)', 'repeat(5, 1fr)', [
                'grid-column: 1 / span 2; grid-row: 1 / span 2;',
                'grid-column: 3 / span 2; grid-row: 1 / span 2;',
                'grid-column: 1 / span 2; grid-row: 3 / span 2;',
                'grid-column: 3 / span 2; grid-row: 3 / span 2;',
                'grid-column: 1 / span 4; grid-row: 5;'
            ], 'featured');
        }

        const fallbackPreview = this.getPreviewMarkup(template, { rows: 3, cols: 3 });
        return fallbackPreview;
    }

    getPreviewMarkup(template, fallback) {
        const rows = template.rows || fallback?.rows;
        const cols = template.cols || fallback?.cols;
        if (!rows || !cols) {
            return '<div class="template-preview" aria-hidden="true"></div>';
        }
        const previewContent = this.buildUniformPreview(rows, cols);
        return `<div class="template-preview" aria-hidden="true">${previewContent}</div>`;
    }

    getIconMarkup(template) {
        if (template.type === 'horizontal') {
            return `
                <div class="template-icon-grid custom-horizontal">
                    <span class="icon-bar"></span>
                    <span class="icon-arrow">↔</span>
                    <span class="icon-bar"></span>
                </div>
            `;
        }

        if (template.type === 'vertical') {
            return `
                <div class="template-icon-grid custom-vertical">
                    <span class="icon-bar"></span>
                    <span class="icon-arrow">↕</span>
                    <span class="icon-bar"></span>
                </div>
            `;
        }

        if (template.type === 'twoColumns') {
            return `
                <div class="template-icon-grid two-columns">
                    <span></span>
                    <span></span>
                </div>
            `;
        }

        if (template.type === 'asymmetric') {
            return `
                <div class="template-icon-grid asymmetric">
                    <span class="asym-left"></span>
                    <span class="asym-top"></span>
                    <span class="asym-bottom"></span>
                </div>
            `;
        }

        if (template.type === 'featured') {
            return `
                <div class="template-icon-grid featured">
                    <span class="feat-a"></span>
                    <span class="feat-b"></span>
                    <span class="feat-c"></span>
                    <span class="feat-d"></span>
                    <span class="feat-e"></span>
                </div>
            `;
        }

        if (template.icon) {
            return `<span>${template.icon}</span>`;
        }

        return '<span>⋯</span>';
    }

    buildUniformPreview(rows, cols) {
        const style = `grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);`;
        const cells = Array.from({ length: rows * cols }, () => '<span class="preview-cell"></span>').join('');
        return `<div class="template-preview-grid" style="${style}">${cells}</div>`;
    }

    buildCustomPreview(columns, rows, cellStyles) {
        const styleParts = [];
        if (columns) styleParts.push(`grid-template-columns: ${columns};`);
        if (rows) styleParts.push(`grid-template-rows: ${rows};`);
        const cells = cellStyles.map(style => `<span class="preview-cell" style="${style}"></span>`).join('');
        return `<div class="template-preview-grid" style="${styleParts.join(' ')}">${cells}</div>`;
    }

    buildUniformIcon(rows, cols, extraClass = '') {
        const gap = cols >= 12 || rows >= 12 ? 1 : (cols >= 6 || rows >= 6 ? 2 : 3);
        const densityClass = cols >= 8 || rows >= 8 ? 'dense' : '';
        const style = `grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr); gap: ${gap}px;`;
        const cells = Array.from({ length: rows * cols }, () => '<span></span>').join('');
        const className = ['template-icon-grid', extraClass, densityClass].filter(Boolean).join(' ');
        return `<div class="${className}" style="${style}">${cells}</div>`;
    }

    buildCustomIcon(columns, rows, cellStyles, extraClass = '') {
        const styleParts = [];
        if (columns) styleParts.push(`grid-template-columns: ${columns};`);
        if (rows) styleParts.push(`grid-template-rows: ${rows};`);
        const gapValue = columns?.includes('repeat') || rows?.includes('repeat') ? 2 : 3;
        const gap = `gap: ${gapValue}px;`;
        const cells = cellStyles.map(style => `<span style="${style}"></span>`).join('');
        const className = ['template-icon-grid', extraClass].filter(Boolean).join(' ');
        return `<div class="${className}" style="${styleParts.join(' ')} ${gap}">${cells}</div>`;
    }
}

