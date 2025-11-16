// Script to generate static HTML pages for SEO
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Read blog data from JSON file
function extractBlogData() {
    const dataPath = join(rootDir, 'scripts', 'blog-data.json');
    if (!existsSync(dataPath)) {
        throw new Error('blog-data.json not found. Run extract-blog-data.js first.');
    }
    const content = readFileSync(dataPath, 'utf-8');
    return JSON.parse(content);
}

// Read the base HTML template
function readTemplate() {
    const templatePath = join(distDir, 'index.html');
    if (!existsSync(templatePath)) {
        throw new Error('index.html not found in dist directory. Run build first.');
    }
    return readFileSync(templatePath, 'utf-8');
}

// Fetch works list from Cloudinary Search API (by tag)
async function fetchWorksFromCloudinary(tag = 'mecollage') {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        console.warn('Cloudinary env not set, skipping works sitemap.');
        return [];
    }
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`;
    const works = [];
    let nextCursor = null;
    do {
        const body = {
            expression: `tags=${tag} AND resource_type:image`,
            max_results: 100,
            sort_by: [{ public_id: 'desc' }]
        };
        if (nextCursor) body.next_cursor = nextCursor;
        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(`Cloudinary search failed: ${resp.status} ${text}`);
        }
        const json = await resp.json();
        (json.resources || []).forEach(r => {
            if (r && r.public_id) {
                works.push(r.public_id); // e.g., works/abcd123
            }
        });
        nextCursor = json.next_cursor;
    } while (nextCursor);
    return works;
}

function formatDateISO(date = new Date()) {
    return new Date(date).toISOString().slice(0, 10);
}

function appendWorksToSitemapXml(xml, worksIds) {
    const today = formatDateISO();
    const base = 'https://www.mecollage.top';
    const block = worksIds.map((id) => {
        const safeId = encodeURI(id);
        return [
            '  <url>',
            `    <loc>${base}/works/${safeId}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            '    <changefreq>monthly</changefreq>',
            '    <priority>0.6</priority>',
            '  </url>'
        ].join('\n');
    }).join('\n');
    if (!block) return xml;
    // Insert before closing </urlset>
    return xml.replace(/\n<\/urlset>\s*$/m, `\n${block}\n</urlset>`);
}

function updateSitemap({ worksIds = [] } = {}) {
    // Update public/sitemap.xml (source)
    const publicSitemap = join(rootDir, 'public', 'sitemap.xml');
    if (existsSync(publicSitemap) && worksIds.length) {
        let xml = readFileSync(publicSitemap, 'utf-8');
        xml = appendWorksToSitemapXml(xml, worksIds);
        writeFileSync(publicSitemap, xml, 'utf-8');
        console.log(`Public sitemap updated with ${worksIds.length} works entries.`);
    }
    // Update dist/sitemap.xml (artifact)
    const distSitemap = join(distDir, 'sitemap.xml');
    if (existsSync(distSitemap) && worksIds.length) {
        let xml = readFileSync(distSitemap, 'utf-8');
        xml = appendWorksToSitemapXml(xml, worksIds);
        writeFileSync(distSitemap, xml, 'utf-8');
        console.log(`Dist sitemap updated with ${worksIds.length} works entries.`);
    }
}

// Generate blog post HTML
function generateBlogPostHTML(template, post, lang = 'en') {
    const localizedPost = post.translations?.[lang] || post.translations?.en || post;
    
    // Get SEO data
    const title = `${localizedPost.title} | MeCollage Blog`;
    const description = localizedPost.excerpt || '';
    const canonical = `https://www.mecollage.top/blog/${post.id}${lang !== 'en' ? `?lang=${lang}` : ''}`;
    
    // Format date
    const date = new Date(post.date);
    const localeMap = {
        'en': 'en-US',
        'zh': 'zh-CN',
        'es': 'es-ES'
    };
    const formattedDate = date.toLocaleDateString(localeMap[lang] || 'en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Category mapping
    const categoryMap = {
        'Tutorial': lang === 'zh' ? '教程' : lang === 'es' ? 'Tutorial' : 'Tutorial',
        'Design Tips': lang === 'zh' ? '设计技巧' : lang === 'es' ? 'Consejos de Diseño' : 'Design Tips',
        'Holiday': lang === 'zh' ? '节日' : lang === 'es' ? 'Festivos' : 'Holiday',
        'Mobile': lang === 'zh' ? '移动端' : lang === 'es' ? 'Móvil' : 'Mobile',
        'Social Media': lang === 'zh' ? '社交媒体' : lang === 'es' ? 'Redes Sociales' : 'Social Media',
        'Portfolio': lang === 'zh' ? '作品集' : lang === 'es' ? 'Portafolio' : 'Portfolio'
    };
    
    const categoryText = categoryMap[post.category] || post.category;
    const backText = lang === 'zh' ? '返回博客' : lang === 'es' ? 'Volver al Blog' : 'Back to Blog';
    const byText = lang === 'zh' ? '作者' : lang === 'es' ? 'Por' : 'By';
    const shareText = lang === 'zh' ? '分享这篇文章:' : lang === 'es' ? 'Compartir este artículo:' : 'Share this article:';
    
    // Get related posts (simplified - just get 3 random posts)
    const allPosts = extractBlogData();
    const relatedPosts = allPosts
        .filter(p => p.id !== post.id)
        .slice(0, 3)
        .map(p => {
            const localized = p.translations?.[lang] || p.translations?.en || p;
            return {
                id: p.id,
                title: localized.title,
                excerpt: localized.excerpt || ''
            };
        });
    
    let relatedHTML = '';
    if (relatedPosts.length > 0) {
        const relatedTitle = lang === 'zh' ? '相关文章' : lang === 'es' ? 'Artículos Relacionados' : 'Related Articles';
        const readMore = lang === 'zh' ? '阅读更多' : lang === 'es' ? 'Leer más' : 'Read more';
        relatedHTML = `
            <div class="blog-related-posts">
                <h2 class="blog-related-title">${relatedTitle}</h2>
                <div class="blog-related-list">
                    ${relatedPosts.map(rp => `
                        <article class="blog-related-item">
                            <h3 class="blog-related-item-title">
                                <a href="/blog/${rp.id}">${rp.title}</a>
                            </h3>
                            <p class="blog-related-item-excerpt">${rp.excerpt}</p>
                            <a href="/blog/${rp.id}" class="blog-related-item-link">${readMore} →</a>
                        </article>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Replace meta tags
    let html = template
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${description.replace(/"/g, '&quot;')}"`)
        .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${canonical}"`)
        .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}"`)
        .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}"`)
        .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${canonical}"`)
        .replace(/<meta name="twitter:title" content=".*?"/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}"`)
        .replace(/<meta name="twitter:description" content=".*?"/, `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}"`);
    
    // Replace lang attribute
    const langAttr = lang === 'zh' ? 'zh-CN' : lang === 'es' ? 'es-ES' : 'en';
    html = html.replace(/<html lang=".*?"/, `<html lang="${langAttr}"`);
    
    // Find and replace the blog post content area
    const blogPostContent = `
        <div class="blog-post-header">
            <a href="/blog" class="blog-back-link">← ${backText}</a>
            <h1 class="blog-post-main-title">${localizedPost.title}</h1>
            <div class="blog-post-meta">
                <span class="blog-date">${formattedDate}</span>
                <span class="blog-category">${categoryText}</span>
                <span class="blog-author">${byText} ${post.author}</span>
            </div>
            <div class="blog-post-tags">
                ${post.tags.map(tag => `<span class="blog-tag">#${tag}</span>`).join('')}
            </div>
        </div>
        <div class="blog-post-body">
            ${localizedPost.content}
        </div>
        ${relatedHTML}
        <div class="blog-post-footer">
            <a href="/blog" class="blog-back-link">← ${backText}</a>
            <div class="blog-share">
                <span>${shareText}</span>
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(localizedPost.title)}&url=${encodeURIComponent(canonical)}" target="_blank" class="blog-share-link">Twitter</a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" class="blog-share-link">Facebook</a>
            </div>
        </div>
    `;
    
    // Replace the page content - find the blog post page container
    // Use a more specific pattern to match the entire blog post page div
    const blogPostPagePattern = /<div id="page-blog-post" class="page-content"[^>]*>[\s\S]*?<\/div>\s*(?=<\/body>|$)/;
    if (blogPostPagePattern.test(html)) {
        html = html.replace(
            blogPostPagePattern,
            `<div id="page-blog-post" class="page-content" style="display: block;">
            <div id="blog-post-content">${blogPostContent}</div>
        </div>`
        );
    } else {
        // Fallback: find and replace the content area
        html = html.replace(
            /<div id="blog-post-content">[\s\S]*?<\/div>/,
            `<div id="blog-post-content">${blogPostContent}</div>`
        );
        html = html.replace(
            /<div id="page-blog-post" class="page-content"[^>]*>/,
            '<div id="page-blog-post" class="page-content" style="display: block;">'
        );
    }
    
    // Hide other pages
    html = html.replace(/<div id="page-home" class="page-content"[^>]*>/g, '<div id="page-home" class="page-content" style="display: none;">');
    html = html.replace(/<div id="page-features" class="page-content"[^>]*>/g, '<div id="page-features" class="page-content" style="display: none;">');
    html = html.replace(/<div id="page-tutorial" class="page-content"[^>]*>/g, '<div id="page-tutorial" class="page-content" style="display: none;">');
    html = html.replace(/<div id="page-blog" class="page-content"[^>]*>/g, '<div id="page-blog" class="page-content" style="display: none;">');
    
    // Hide header
    html = html.replace(/<header class="header ghibli-header"[^>]*>/g, '<header class="header ghibli-header" style="display: none;">');
    
    return html;
}

// Generate static pages
async function generateStaticPages() {
    console.log('Generating static HTML pages...');
    
    if (!existsSync(distDir)) {
        throw new Error('dist directory not found. Run "npm run build" first.');
    }
    
    const template = readTemplate();
    const posts = extractBlogData();
    const worksIds = await fetchWorksFromCloudinary('mecollage');
    
    // Create blog directory
    const blogDir = join(distDir, 'blog');
    if (!existsSync(blogDir)) {
        mkdirSync(blogDir, { recursive: true });
    }
    
    // Generate blog post pages for each language
    const languages = ['en', 'zh', 'es'];
    posts.forEach(post => {
        languages.forEach(lang => {
            const html = generateBlogPostHTML(template, post, lang);
            const filename = lang === 'en' ? `${post.id}.html` : `${post.id}.${lang}.html`;
            const filepath = join(blogDir, filename);
            writeFileSync(filepath, html, 'utf-8');
            console.log(`Generated: /blog/${filename}`);
        });
    });
    
    // Generate features and tutorial pages
    generateFeaturesPage(template);
    generateTutorialPage(template);
    updateSitemap({ worksIds });
    
    console.log(`Generated ${posts.length * languages.length} blog post pages`);
    console.log('Static page generation complete!');
}

// Generate features page
function generateFeaturesPage(template) {
    const title = 'Features - Free Collage Maker with 20+ Templates | MeCollage';
    const description = 'Discover powerful collage making features: unlimited images, 20+ templates, AI recommendations, custom grids, filters, themes, and high-quality export. All completely free!';
    const canonical = 'https://www.mecollage.top/features';
    
    let html = template
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${description.replace(/"/g, '&quot;')}"`)
        .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${canonical}"`)
        .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}"`)
        .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}"`)
        .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${canonical}"`)
        .replace(/<meta name="twitter:title" content=".*?"/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}"`)
        .replace(/<meta name="twitter:description" content=".*?"/, `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}"`);
    
    // Show features page, hide others
    html = html.replace(/<div id="page-features" class="page-content"[^>]*>/g, '<div id="page-features" class="page-content" style="display: block;">');
    html = html.replace(/<div id="page-home" class="page-content"[^>]*>/g, '<div id="page-home" class="page-content" style="display: none;">');
    html = html.replace(/<div id="page-tutorial" class="page-content"[^>]*>/g, '<div id="page-tutorial" class="page-content" style="display: none;">');
    html = html.replace(/<div id="page-blog" class="page-content"[^>]*>/g, '<div id="page-blog" class="page-content" style="display: none;">');
    html = html.replace(/<div id="page-blog-post" class="page-content"[^>]*>/g, '<div id="page-blog-post" class="page-content" style="display: none;">');
    
    // Hide header
    html = html.replace(/<header class="header ghibli-header"[^>]*>/g, '<header class="header ghibli-header" style="display: none;">');
    
    const filepath = join(distDir, 'features.html');
    writeFileSync(filepath, html, 'utf-8');
    console.log('Generated: /features.html');
}

// Generate tutorial page
function generateTutorialPage(template) {
    const title = 'How to Make a Photo Collage - Step-by-Step Tutorial | MeCollage';
    const description = 'Learn how to create beautiful photo collages in minutes. Complete step-by-step guide with tips, tricks, and FAQs. Perfect for beginners and advanced users.';
    const canonical = 'https://www.mecollage.top/tutorial';
    
    let html = template
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${description.replace(/"/g, '&quot;')}"`)
        .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${canonical}"`)
        .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}"`)
        .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}"`)
        .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${canonical}"`)
        .replace(/<meta name="twitter:title" content=".*?"/, `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}"`)
        .replace(/<meta name="twitter:description" content=".*?"/, `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}"`);
    
    // Show tutorial page, hide others
    html = html.replace(/<div id="page-tutorial" class="page-content"[^>]*>/g, '<div id="page-tutorial" class="page-content" style="display: block;">');
    html = html.replace(/<div id="page-home" class="page-content"[^>]*>/g, '<div id="page-home" class="page-content" style="display: none;">');
    html = html.replace(/<div id="page-features" class="page-content"[^>]*>/g, '<div id="page-features" class="page-content" style="display: none;">');
    html = html.replace(/<div id="page-blog" class="page-content"[^>]*>/g, '<div id="page-blog" class="page-content" style="display: none;">');
    html = html.replace(/<div id="page-blog-post" class="page-content"[^>]*>/g, '<div id="page-blog-post" class="page-content" style="display: none;">');
    
    // Hide header
    html = html.replace(/<header class="header ghibli-header"[^>]*>/g, '<header class="header ghibli-header" style="display: none;">');
    
    const filepath = join(distDir, 'tutorial.html');
    writeFileSync(filepath, html, 'utf-8');
    console.log('Generated: /tutorial.html');
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('generate-static-pages')) {
    // Node 18+ provides global fetch
    generateStaticPages().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

export { generateStaticPages, extractBlogData };

