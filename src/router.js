// Simple Router for page navigation
import { i18n } from './i18n.js';
import { seoManager } from './seo-manager.js';
import { renderShareLinks } from './share.js';

export class Router {
    constructor() {
        this.currentPage = 'home';
        this.pages = {
            home: 'home',
            features: 'features',
            tutorial: 'tutorial',
            blog: 'blog',
            works: 'works'
        };
        this.init();
    }
    
    init() {
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const path = this.getPathFromURL();
            this.navigateToPath(path, false);
        });
        
        // Check initial URL
        const path = this.getPathFromURL();
        this.navigateToPath(path, false);
    }
    
    getPathFromURL() {
        // Get path from URL (e.g., /blog/how-to-make-photo-collage -> blog/how-to-make-photo-collage)
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') {
            return 'home';
        }
        // Remove leading slash and .html if present
        let cleanPath = path.replace(/^\//, '').replace(/\.html$/, '');
        // Handle blog posts (e.g., blog/how-to-make-photo-collage or blog/how-to-make-photo-collage.zh)
        if (cleanPath.startsWith('blog/')) {
            // Remove language suffix if present (e.g., blog/post-id.zh -> blog/post-id)
            const postPath = cleanPath.replace(/\.(en|zh|es)$/, '');
            return postPath;
        }
        // Works public page: works/{id}
        if (cleanPath.startsWith('works/')) {
            return cleanPath;
        }
        // Map common paths
        const pathMap = {
            'features': 'features',
            'tutorial': 'tutorial',
            'blog': 'blog'
        };
        return pathMap[cleanPath] || 'home';
    }
    
    navigateToPath(path, pushState = true) {
        if (path.startsWith('blog/')) {
            const postId = path.replace('blog/', '');
            this.showBlogPost(postId, pushState);
        } else {
            this.showPage(path, pushState);
        }
    }
    
    navigate(page) {
        if (this.pages[page]) {
            this.showPage(page, true);
        }
    }
    
    showPage(page, pushState = true) {
        // Handle blog post pages
        if (page.startsWith('blog/')) {
            const postId = page.replace('blog/', '');
            this.showBlogPost(postId, pushState);
            return;
        }
        if (page.startsWith('works/')) {
            const worksId = page.replace('works/', '');
            this.showWorkPage(worksId, pushState);
            return;
        }
        
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(p => {
            p.style.display = 'none';
        });
        
        // Show/hide header based on page
        const header = document.querySelector('.ghibli-header');
        if (header) {
            if (page === 'home') {
                header.style.display = 'block';
            } else {
                header.style.display = 'none';
            }
        }
        
        // Show target page
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.style.display = 'block';
            this.currentPage = page;
            
            // Update SEO meta tags
            seoManager.updateSEO(page);
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.dataset.page === page || (page.startsWith('blog') && link.dataset.page === 'blog')) {
                    link.classList.add('active');
                }
            });
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Update URL without reload
            if (pushState) {
                const url = page === 'home' ? '/' : `/${page}`;
                window.history.pushState({ page }, '', url);
            }
        }
    }
    
    showWorkPage(worksId, pushState = true) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(p => {
            p.style.display = 'none';
        });
        const header = document.querySelector('.ghibli-header');
        if (header) header.style.display = 'none';
        const worksPage = document.getElementById('page-works');
        if (worksPage) {
            worksPage.style.display = 'block';
            this.currentPage = `works/${worksId}`;
            this.renderWorkPage(worksId);
            // Basic SEO
            seoManager.updateSEO(this.currentPage);
            if (pushState) {
                window.history.pushState({ page: `works/${worksId}` }, '', `/works/${worksId}`);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    renderWorkPage(worksId) {
        const container = document.getElementById('works-content');
        if (!container) return;
        const { i18n } = window; // already imported at top as well
        const title = i18n.t('works.pageTitle');
        const subtitle = i18n.t('works.pageSubtitle');
        // worksId is Cloudinary public_id (possibly URL-encoded)
        const decodedId = decodeURIComponent(worksId);
        const imageUrl = `https://res.cloudinary.com/dztbpf6ke/image/upload/${decodedId}.jpg`.replace(/\.jpg\.jpg$/, '.jpg'); // attempt default extension
        container.innerHTML = `
            <h1 class="page-title">${title}</h1>
            <p class="page-subtitle">${subtitle}</p>
            <div class="work-hero">
                <img src="https://res.cloudinary.com/dztbpf6ke/image/upload/${decodedId}" alt="Public Work">
            </div>
        `;
    }
    
    showBlogPost(postId, pushState = true) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(p => {
            p.style.display = 'none';
        });
        
        // Hide header
        const header = document.querySelector('.ghibli-header');
        if (header) {
            header.style.display = 'none';
        }
        
        // Show blog post page
        const blogPostPage = document.getElementById('page-blog-post');
        if (blogPostPage) {
            blogPostPage.style.display = 'block';
            this.currentPage = `blog/${postId}`;
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.dataset.page === 'blog') {
                    link.classList.add('active');
                }
            });
            
            // Load post content
            if (window.blogManager) {
                const post = window.blogManager.getPostById(postId);
                if (post) {
                    this.renderBlogPost(post);
                    // Update SEO meta tags for blog post
                    seoManager.updateSEO(`blog/${postId}`, post);
                }
            }
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Update URL
            if (pushState) {
                window.history.pushState({ page: `blog/${postId}` }, '', `/blog/${postId}`);
            }
        }
    }
    
    renderBlogPost(post) {
        const container = document.getElementById('blog-post-content');
        if (!container) return;
        
        // Get localized post content
        const currentLang = i18n.currentLang;
        const localizedPost = window.blogManager ? window.blogManager.getLocalizedPost(post, currentLang) : post;
        
        const backText = i18n.t('blog.backToBlog');
        const byText = i18n.t('blog.by');
        const shareText = i18n.t('blog.shareArticle');
        const relatedText = i18n.t('blog.relatedArticles');
        const readMoreText = i18n.t('blog.readMore');
        const categoryMap = {
            'Tutorial': i18n.t('blog.categories.tutorial'),
            'Design Tips': i18n.t('blog.categories.designTips'),
            'Holiday': i18n.t('blog.categories.holiday'),
            'Mobile': i18n.t('blog.categories.mobile'),
            'Social Media': i18n.t('blog.categories.socialMedia'),
            'Portfolio': i18n.t('blog.categories.portfolio')
        };
        
        // Get related posts
        const relatedPosts = window.blogManager ? window.blogManager.getRelatedPosts(post.id, 3, currentLang) : [];
        let relatedPostsHTML = '';
        if (relatedPosts.length > 0) {
            relatedPostsHTML = `
                <div class="blog-related-posts">
                    <h2 class="blog-related-title">${relatedText}</h2>
                    <div class="blog-related-list">
                        ${relatedPosts.map(relatedPost => {
                            const localizedRelated = window.blogManager.getLocalizedPost(relatedPost, currentLang);
                            return `
                                <article class="blog-related-item">
                                    <h3 class="blog-related-item-title">
                                        <a href="/blog/${relatedPost.id}">${localizedRelated.title}</a>
                                    </h3>
                                    <p class="blog-related-item-excerpt">${localizedRelated.excerpt}</p>
                                    <a href="/blog/${relatedPost.id}" class="blog-related-item-link">${readMoreText} →</a>
                                </article>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="blog-post-header">
                <a href="/blog" class="blog-back-link">← ${backText}</a>
                <h1 class="blog-post-main-title">${localizedPost.title}</h1>
                <div class="blog-post-meta">
                    <span class="blog-date">${this.formatDate(post.date)}</span>
                    <span class="blog-category">${categoryMap[post.category] || post.category}</span>
                    <span class="blog-author">${byText} ${post.author}</span>
                </div>
                <div class="blog-post-tags">
                    ${post.tags.map(tag => `<span class="blog-tag">#${tag}</span>`).join('')}
                </div>
            </div>
            <div class="blog-post-body">
                ${localizedPost.content}
            </div>
            ${relatedPostsHTML}
            <div class="blog-post-footer">
                <a href="/blog" class="blog-back-link">← ${backText}</a>
                <div class="blog-share" id="blogShare"></div>
            </div>
        `;
        const shareContainer = document.getElementById('blogShare');
        renderShareLinks(shareContainer, {
            title: localizedPost.title,
            text: localizedPost.excerpt || localizedPost.title,
            campaign: `blog_${post.id}`
        });
    }
    
    formatDate(dateString) {
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
}

export const router = new Router();

