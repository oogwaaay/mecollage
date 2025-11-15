// SEO Manager - Handles dynamic meta tags, titles, and canonical URLs
import { i18n } from './i18n.js';

export class SEOManager {
    constructor() {
        this.baseUrl = 'https://www.mecollage.top';
        this.init();
    }
    
    init() {
        // Ensure meta tags exist
        this.ensureMetaTags();
    }
    
    ensureMetaTags() {
        const head = document.head;
        
        // Ensure canonical tag exists
        if (!document.querySelector('link[rel="canonical"]')) {
            const canonical = document.createElement('link');
            canonical.rel = 'canonical';
            head.appendChild(canonical);
        }
        
        // Ensure OG tags exist
        const ogTags = ['og:title', 'og:description', 'og:url', 'og:type'];
        ogTags.forEach(prop => {
            if (!document.querySelector(`meta[property="${prop}"]`)) {
                const meta = document.createElement('meta');
                meta.setAttribute('property', prop);
                head.appendChild(meta);
            }
        });
        
        // Ensure Twitter Card tags exist
        const twitterTags = ['twitter:title', 'twitter:description'];
        twitterTags.forEach(name => {
            if (!document.querySelector(`meta[name="${name}"]`)) {
                const meta = document.createElement('meta');
                meta.setAttribute('name', name);
                head.appendChild(meta);
            }
        });
    }
    
    // SEO configurations for each page
    getSEOConfig(page, post = null) {
        const lang = i18n.currentLang;
        const langMap = {
            'en': {
                home: {
                    title: 'MeCollage - Free Online Photo Collage Maker | Create Stunning Collages',
                    description: 'Create beautiful photo collages with unlimited images. Free online collage maker with 20+ templates, custom grids, filters, and decorations. Export in PNG or JPG format. Start creating now!',
                    keywords: 'collage maker, photo collage, image collage, online collage maker, free collage maker, photo grid, image editor, how to make a collage',
                    canonical: `${this.baseUrl}/`
                },
                features: {
                    title: 'Features - Free Collage Maker with 20+ Templates | MeCollage',
                    description: 'Discover powerful collage making features: unlimited images, 20+ templates, AI recommendations, custom grids, filters, themes, and high-quality export. All completely free!',
                    keywords: 'collage maker features, photo collage templates, collage maker tools, free collage features, image collage options',
                    canonical: `${this.baseUrl}/features`
                },
                tutorial: {
                    title: 'How to Make a Photo Collage - Step-by-Step Tutorial | MeCollage',
                    description: 'Learn how to create beautiful photo collages in minutes. Complete step-by-step guide with tips, tricks, and FAQs. Perfect for beginners and advanced users.',
                    keywords: 'how to make a collage, photo collage tutorial, collage making guide, how to create collage, collage tutorial',
                    canonical: `${this.baseUrl}/tutorial`
                },
                blog: {
                    title: 'Photo Collage Tutorials & Guides | MeCollage Blog',
                    description: 'Learn how to create stunning photo collages with our guides and tips. Tutorials, design tips, holiday guides, and mobile collage tips.',
                    keywords: 'collage tutorial, photo collage guide, collage tips, collage design, collage blog',
                    canonical: `${this.baseUrl}/blog`
                }
            },
            'zh': {
                home: {
                    title: 'MeCollage - 免费在线照片拼图制作工具 | 创建精美拼图',
                    description: '使用无限图片创建精美照片拼图。免费在线拼图制作工具，提供20+模板、自定义网格、滤镜和装饰。支持PNG或JPG格式导出。立即开始创建！',
                    keywords: '拼图工具, 照片拼图, 图片拼图, 在线拼图制作, 免费拼图工具, 拼图制作, 如何制作拼图',
                    canonical: `${this.baseUrl}/?lang=zh`
                },
                features: {
                    title: '功能特色 - 20+模板免费拼图制作工具 | MeCollage',
                    description: '发现强大的拼图制作功能：无限图片、20+模板、AI推荐、自定义网格、滤镜、主题和高质量导出。完全免费！',
                    keywords: '拼图工具功能, 照片拼图模板, 拼图制作工具, 免费拼图功能, 图片拼图选项',
                    canonical: `${this.baseUrl}/features?lang=zh`
                },
                tutorial: {
                    title: '如何制作照片拼图 - 分步教程 | MeCollage',
                    description: '学习如何在几分钟内创建精美的照片拼图。完整的分步指南，包含技巧、窍门和常见问题。适合初学者和高级用户。',
                    keywords: '如何制作拼图, 照片拼图教程, 拼图制作指南, 如何创建拼图, 拼图教程',
                    canonical: `${this.baseUrl}/tutorial?lang=zh`
                },
                blog: {
                    title: '照片拼图教程与指南 | MeCollage 博客',
                    description: '通过我们的指南和技巧学习如何创建精美的照片拼图。教程、设计技巧、节日指南和移动端拼图技巧。',
                    keywords: '拼图教程, 照片拼图指南, 拼图技巧, 拼图设计, 拼图博客',
                    canonical: `${this.baseUrl}/blog?lang=zh`
                }
            },
            'es': {
                home: {
                    title: 'MeCollage - Creador de Collages de Fotos Gratis Online | Crea Collages Impresionantes',
                    description: 'Crea hermosos collages de fotos con imágenes ilimitadas. Creador de collages online gratis con 20+ plantillas, cuadrículas personalizadas, filtros y decoraciones. Exporta en formato PNG o JPG. ¡Comienza a crear ahora!',
                    keywords: 'creador de collage, collage de fotos, collage de imágenes, creador de collage online, collage gratis, cómo hacer un collage',
                    canonical: `${this.baseUrl}/?lang=es`
                },
                features: {
                    title: 'Características - Creador de Collages Gratis con 20+ Plantillas | MeCollage',
                    description: 'Descubre potentes funciones para crear collages: imágenes ilimitadas, 20+ plantillas, recomendaciones IA, cuadrículas personalizadas, filtros, temas y exportación de alta calidad. ¡Todo completamente gratis!',
                    keywords: 'características creador collage, plantillas collage fotos, herramientas collage, funciones collage gratis, opciones collage imágenes',
                    canonical: `${this.baseUrl}/features?lang=es`
                },
                tutorial: {
                    title: 'Cómo Hacer un Collage de Fotos - Tutorial Paso a Paso | MeCollage',
                    description: 'Aprende a crear hermosos collages de fotos en minutos. Guía completa paso a paso con consejos, trucos y preguntas frecuentes. Perfecto para principiantes y usuarios avanzados.',
                    keywords: 'cómo hacer un collage, tutorial collage fotos, guía hacer collage, cómo crear collage, tutorial collage',
                    canonical: `${this.baseUrl}/tutorial?lang=es`
                },
                blog: {
                    title: 'Tutoriales y Guías de Collages de Fotos | Blog MeCollage',
                    description: 'Aprende a crear collages de fotos impresionantes con nuestras guías y consejos. Tutoriales, consejos de diseño, guías de vacaciones y consejos de collage móvil.',
                    keywords: 'tutorial collage, guía collage fotos, consejos collage, diseño collage, blog collage',
                    canonical: `${this.baseUrl}/blog?lang=es`
                }
            }
        };
        
        // Get base config for the page
        let config = langMap[lang]?.[page] || langMap['en'][page];
        
        // If it's a blog post, override with post-specific SEO
        if (post && page.startsWith('blog/')) {
            const localizedPost = window.blogManager ? window.blogManager.getLocalizedPost(post, lang) : post;
            const postId = page.replace('blog/', '');
            const postUrl = `${this.baseUrl}/blog/${postId}${lang !== 'en' ? `?lang=${lang}` : ''}`;
            
            config = {
                title: `${localizedPost.title} | MeCollage Blog`,
                description: localizedPost.excerpt || config.description,
                keywords: post.tags.join(', ') + ', collage tutorial, photo collage guide',
                canonical: postUrl
            };
        }
        
        return config;
    }
    
    updateSEO(page, post = null) {
        const config = this.getSEOConfig(page, post);
        const lang = i18n.currentLang;
        
        // Update title
        document.title = config.title;
        
        // Update meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', config.description);
        
        // Update meta keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.setAttribute('name', 'keywords');
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', config.keywords);
        
        // Update canonical
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', config.canonical);
        
        // Update OG tags
        this.updateOGTag('og:title', config.title);
        this.updateOGTag('og:description', config.description);
        this.updateOGTag('og:url', config.canonical);
        this.updateOGTag('og:type', page.startsWith('blog/') ? 'article' : 'website');
        
        // Update Twitter Card tags
        this.updateMetaTag('twitter:title', config.title);
        this.updateMetaTag('twitter:description', config.description);
        
        // Update lang attribute
        const langMap = {
            'en': 'en',
            'zh': 'zh-CN',
            'es': 'es-ES'
        };
        document.documentElement.setAttribute('lang', langMap[lang] || 'en');
    }
    
    updateOGTag(property, content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }
    
    updateMetaTag(name, content) {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', name);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }
}

export const seoManager = new SEOManager();

