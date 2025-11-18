// SEO Manager - Handles dynamic meta tags, titles, and canonical URLs
import { i18n } from './i18n.js';

export class SEOManager {
    constructor() {
        this.baseUrl = 'https://www.mecollage.top';
        this.faqContent = {
            home: [
                {
                    question: 'Is MeCollage completely free to use?',
                    answer: 'Yes. You can upload unlimited images, use every template, and export PNG or JPG files without logging in or paying.'
                },
                {
                    question: 'Do exports include a watermark?',
                    answer: 'No. Every download is watermark-free so you can share collages on any platform.'
                }
            ],
            features: [
                {
                    question: 'How many images can I add to a collage?',
                    answer: 'You can add 20+ images by default and the custom grid allows expanding even further depending on your layout settings.'
                },
                {
                    question: 'Which layouts and sizes are available?',
                    answer: 'Choose from horizontal, vertical, story, square, multi-grid, and fully custom layouts with adjustable spacing and borders.'
                }
            ],
            tutorial: [
                {
                    question: 'What is the fastest way to create a collage?',
                    answer: 'Upload all photos, pick a template from the recommendations, adjust spacing or colors, then click Export to download your collage.'
                },
                {
                    question: 'Can I edit collages on mobile?',
                    answer: 'Yes. The UI is responsive so you can drag, resize, and export collages on phones and tablets.'
                }
            ]
        };
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
                    title: 'MeCollage | Free Online Photo Collage Maker (No Watermark)',
                    description: 'Design photo collages with unlimited images, 20+ layouts, custom grids, filters, and instant PNG/JPG export. No login, no watermark, totally free.',
                    keywords: 'free collage maker, no watermark collage, online photo collage, unlimited images collage, custom grid collage, png jpg export',
                    canonical: `${this.baseUrl}/`
                },
                features: {
                    title: 'Collage Maker Features | 20+ Layouts, AI Ideas & Custom Grids',
                    description: 'Explore every MeCollage feature: AI template suggestions, responsive grids, spacing controls, stickers, filters, story/square exports, and watermark-free downloads.',
                    keywords: 'collage maker features, ai collage templates, custom grid collage, collage spacing controls, story collage maker',
                    canonical: `${this.baseUrl}/features`
                },
                tutorial: {
                    title: 'How to Use MeCollage | Step-by-Step Free Collage Tutorial',
                    description: 'Follow this quick start guide to upload photos, pick templates, fine-tune spacing, add text, and export a collage in under five minutes.',
                    keywords: 'how to use mecollage, free collage tutorial, quick collage guide, photo collage tips',
                    canonical: `${this.baseUrl}/tutorial`
                },
                blog: {
                    title: 'Collage Tips, Layout Ideas & Templates | MeCollage Blog',
                    description: 'Weekly guides covering layout ideas, social-ready sizes, design trends, and free templates to level up every collage project.',
                    keywords: 'collage tips, collage ideas, free collage templates, collage design blog, social media collage guide',
                    canonical: `${this.baseUrl}/blog`
                },
                works: {
                    title: 'Public Collage Gallery | MeCollage Inspiration Board',
                    description: 'Browse shareable collages created by the community. Copy the embed code or share the work to inspire your next layout.',
                    keywords: 'public collage gallery, collage inspiration, embed collage, mecollage works',
                    canonical: `${this.baseUrl}/works`
                }
            },
            'zh': {
                home: {
                    title: 'MeCollage｜免费在线照片拼图工具（无水印）',
                    description: '无限张图片、20+模板、自定义网格与滤镜特效，几分钟即可导出 PNG/JPG 拼图，无需登录、无任何水印。',
                    keywords: '免费拼图工具, 无水印拼图, 在线照片拼图, 自定义网格拼图, 拼图导出PNG',
                    canonical: `${this.baseUrl}/?lang=zh`
                },
                features: {
                    title: '功能亮点｜20+ 模板、AI 推荐、自定义网格',
                    description: '了解 MeCollage 的全部功能：AI 模板推荐、响应式网格、边距/边框控制、贴纸滤镜、故事/方形尺寸导出，全程免费。',
                    keywords: '拼图功能, AI 拼图模板, 自定义拼图网格, 拼图边距设置, 拼图导出',
                    canonical: `${this.baseUrl}/features?lang=zh`
                },
                tutorial: {
                    title: '新手教程｜5 分钟完成高质量拼图',
                    description: '按步骤上传照片、选择模板、调节间距颜色、添加文字贴纸，最后一键导出。移动端同样适用。',
                    keywords: '拼图教程, 拼图步骤, 手机拼图指南, 快速拼图',
                    canonical: `${this.baseUrl}/tutorial?lang=zh`
                },
                blog: {
                    title: '拼图灵感与模板推荐｜MeCollage 博客',
                    description: '定期更新拼图灵感、社媒尺寸、节日模板、设计技巧与免费素材，帮助你快速出片。',
                    keywords: '拼图灵感, 拼图模板推荐, 社媒拼图, 拼图设计技巧',
                    canonical: `${this.baseUrl}/blog?lang=zh`
                },
                works: {
                    title: '公开拼图画廊｜社区灵感墙',
                    description: '浏览用户公开分享的拼图作品，获取布局灵感或复制嵌入代码展示在自己网站上。',
                    keywords: '拼图画廊, 拼图灵感, 拼图嵌入, MeCollage 作品',
                    canonical: `${this.baseUrl}/works?lang=zh`
                }
            },
            'es': {
                home: {
                    title: 'MeCollage | Creador de collages gratis sin marca de agua',
                    description: 'Diseña collages con imágenes ilimitadas, 20+ plantillas y cuadrículas personalizadas. Exporta en PNG/JPG sin registrarte ni dejar marca de agua.',
                    keywords: 'creador de collage gratis, collage sin marca de agua, collage online, plantillas de collage',
                    canonical: `${this.baseUrl}/?lang=es`
                },
                features: {
                    title: 'Funciones clave | Plantillas, IA y cuadrículas personalizadas',
                    description: 'Conoce las funciones de MeCollage: sugerencias con IA, cuadrículas responsivas, controles de espaciado, filtros y exportaciones optimizadas para redes.',
                    keywords: 'funciones creador collage, plantillas collage, IA collage, cuadrículas personalizadas',
                    canonical: `${this.baseUrl}/features?lang=es`
                },
                tutorial: {
                    title: 'Tutorial rápido | Cómo crear un collage en 5 minutos',
                    description: 'Guía paso a paso para subir fotos, elegir plantillas, ajustar colores y descargar tu collage gratis en menos de cinco minutos.',
                    keywords: 'tutorial collage gratis, cómo usar mecollage, guía collage paso a paso',
                    canonical: `${this.baseUrl}/tutorial?lang=es`
                },
                blog: {
                    title: 'Ideas, plantillas y consejos de collage | Blog MeCollage',
                    description: 'Artículos con ideas de diseño, tamaños ideales para redes, guías de temporada y plantillas gratuitas para inspirar tus collages.',
                    keywords: 'ideas de collage, plantillas gratis collage, consejos de diseño collage, blog collage',
                    canonical: `${this.baseUrl}/blog?lang=es`
                },
                works: {
                    title: 'Galería pública de collages | Inspiración MeCollage',
                    description: 'Explora collages creados por la comunidad, comparte enlaces públicos o usa el código de inserción para mostrarlos en tu web.',
                    keywords: 'galería de collages, inspiración collage, incrustar collage, mecollage works',
                    canonical: `${this.baseUrl}/works?lang=es`
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
        // Works with id: works/{id}
        if (page && page.startsWith('works/')) {
            const worksId = page.replace('works/', '');
            const worksUrl = `${this.baseUrl}/works/${worksId}${lang !== 'en' ? `?lang=${lang}` : ''}`;
            const baseConf = langMap[lang]?.['works'] || langMap['en']['works'];
            config = {
                title: `${baseConf.title} | ${worksId}`,
                description: baseConf.description,
                keywords: baseConf.keywords,
                canonical: worksUrl
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

        this.updateStructuredData(page, post, config);
        this.updateHrefLangLinks(page, post);
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

    updateStructuredData(page, post, config) {
        this.updateBreadcrumbSchema(page, post, config);
        this.updateFAQSchema(page);
    }

    updateBreadcrumbSchema(page, post, config) {
        const items = [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: `${this.baseUrl}/`
            }
        ];

        const addBreadcrumb = (name, url) => {
            items.push({
                '@type': 'ListItem',
                position: items.length + 1,
                name,
                item: url
            });
        };

        const langSuffix = i18n.currentLang && i18n.currentLang !== 'en' ? `?lang=${i18n.currentLang}` : '';

        if (page === 'features') {
            addBreadcrumb('Features', `${this.baseUrl}/features${langSuffix}`);
        } else if (page === 'tutorial') {
            addBreadcrumb('Tutorial', `${this.baseUrl}/tutorial${langSuffix}`);
        } else if (page === 'blog') {
            addBreadcrumb('Blog', `${this.baseUrl}/blog${langSuffix}`);
        } else if (page === 'works') {
            addBreadcrumb('Public Works', `${this.baseUrl}/works${langSuffix}`);
        } else if (page && page.startsWith('blog/')) {
            const postId = page.replace('blog/', '');
            addBreadcrumb('Blog', `${this.baseUrl}/blog${langSuffix}`);
            addBreadcrumb(post?.title || 'Post', config?.canonical || `${this.baseUrl}/blog/${postId}`);
        } else if (page && page.startsWith('works/')) {
            const worksId = page.replace('works/', '');
            addBreadcrumb('Public Works', `${this.baseUrl}/works${langSuffix}`);
            addBreadcrumb(worksId, config?.canonical || `${this.baseUrl}/works/${worksId}`);
        }

        const breadcrumbData = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items
        };

        this.setJSONLDScript('structured-breadcrumb', breadcrumbData);
    }

    updateFAQSchema(page) {
        const faqEntries = this.faqContent[page];
        if (!faqEntries) {
            this.setJSONLDScript('structured-faq', null);
            return;
        }

        const faqData = {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqEntries.map(entry => ({
                '@type': 'Question',
                name: entry.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: entry.answer
                }
            }))
        };

        this.setJSONLDScript('structured-faq', faqData);
    }

    setJSONLDScript(id, data) {
        let script = document.getElementById(id);
        if (!data) {
            if (script) {
                script.remove();
            }
            return;
        }

        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.id = id;
            document.head.appendChild(script);
        }

        script.textContent = JSON.stringify(data);
    }

    updateHrefLangLinks(page, post) {
        const langs = ['en', 'zh', 'es'];
        const head = document.head;
        // Remove previous alternate links
        Array.from(head.querySelectorAll('link[rel="alternate"][hreflang]')).forEach(link => {
            if (!link.dataset.static) {
                link.remove();
            }
        });

        const base = this.baseUrl;
        const buildUrl = (lang, path = '') => {
            if (!path) {
                return lang === 'en' ? `${base}/` : `${base}/?lang=${lang}`;
            }
            if (lang === 'en') {
                return `${base}${path}`;
            }
            const separator = path.includes('?') ? '&' : '?';
            return `${base}${path}${separator}lang=${lang}`;
        };

        const targetPaths = {
            home: '',
            features: '/features',
            tutorial: '/tutorial',
            blog: '/blog'
        };

        let path = '';
        if (targetPaths[page] !== undefined) {
            path = targetPaths[page];
        } else if (page && page.startsWith('blog/')) {
            const postId = page.replace('blog/', '');
            path = `/blog/${postId}`;
        } else if (page && page.startsWith('works/')) {
            const worksId = page.replace('works/', '');
            path = `/works/${worksId}`;
        } else if (page === 'works') {
            path = '/works';
        }

        if (path === null) return;

        const links = [];
        langs.forEach(langCode => {
            links.push({
                hreflang: langCode,
                href: buildUrl(langCode, path)
            });
        });
        // x-default
        links.push({
            hreflang: 'x-default',
            href: path ? `${base}${path}` : `${base}/`
        });

        links.forEach(({ hreflang, href }) => {
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = hreflang;
            link.href = href;
            head.appendChild(link);
        });
    }
}

export const seoManager = new SEOManager();

