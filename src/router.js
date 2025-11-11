// Simple Router for page navigation
export class Router {
    constructor() {
        this.currentPage = 'home';
        this.pages = {
            home: 'home',
            features: 'features',
            tutorial: 'tutorial'
        };
        this.init();
    }
    
    init() {
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || 'home';
            this.showPage(page, false);
        });
        
        // Check initial URL
        const hash = window.location.hash.slice(1) || 'home';
        this.showPage(hash, false);
    }
    
    navigate(page) {
        if (this.pages[page]) {
            this.showPage(page, true);
        }
    }
    
    showPage(page, pushState = true) {
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
                if (link.dataset.page === page) {
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
}

export const router = new Router();

