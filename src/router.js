// Simple Router for page navigation
import { i18n } from './i18n.js';

export class Router {
    constructor() {
        this.currentPage = 'home';
        this.pages = {
            home: 'home',
            features: 'features',
            tutorial: 'tutorial',
            blog: 'blog'
        };
        this.init();
    }
    
    init() {
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || window.location.hash.slice(1) || 'home';
            if (page.startsWith('blog/')) {
                const postId = page.replace('blog/', '');
                this.showBlogPost(postId, false);
            } else {
                this.showPage(page, false);
            }
        });
        
        // Check initial URL
        const hash = window.location.hash.slice(1) || 'home';
        if (hash.startsWith('blog/')) {
            this.showBlogPost(hash.replace('blog/', ''), false);
        } else {
            this.showPage(hash, false);
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
                window.history.pushState({ page }, '', `#${page}`);
            }
        }
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
                }
            }
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Update URL
            if (pushState) {
                window.history.pushState({ page: `blog/${postId}` }, '', `#blog/${postId}`);
            }
        }
    }
    
    renderBlogPost(post) {
        const container = document.getElementById('blog-post-content');
        if (!container) return;
        
        const backText = i18n.t('blog.backToBlog');
        const byText = i18n.t('blog.by');
        const shareText = i18n.t('blog.shareArticle');
        const categoryMap = {
            'Tutorial': i18n.t('blog.categories.tutorial'),
            'Design Tips': i18n.t('blog.categories.designTips'),
            'Holiday': i18n.t('blog.categories.holiday'),
            'Mobile': i18n.t('blog.categories.mobile'),
            'Social Media': i18n.t('blog.categories.socialMedia'),
            'Portfolio': i18n.t('blog.categories.portfolio')
        };
        
        container.innerHTML = `
            <div class="blog-post-header">
                <a href="#blog" class="blog-back-link">← ${backText}</a>
                <h1 class="blog-post-main-title">${post.title}</h1>
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
                ${post.content}
            </div>
            <div class="blog-post-footer">
                <a href="#blog" class="blog-back-link">← ${backText}</a>
                <div class="blog-share">
                    <span>${shareText}</span>
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}" target="_blank" class="blog-share-link">Twitter</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="blog-share-link">Facebook</a>
                </div>
            </div>
        `;
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

