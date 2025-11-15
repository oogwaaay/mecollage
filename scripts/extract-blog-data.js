// Extract blog data from blog-manager.js and save as JSON
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Use dynamic import to load the blog manager
async function extractBlogData() {
    try {
        // Read the blog-manager.js file
        const blogManagerPath = join(rootDir, 'src', 'blog-manager.js');
        const blogManagerUrl = `file://${blogManagerPath}`;
        
        // Import the module
        const module = await import(blogManagerUrl);
        const { blogManager } = module;
        
        // Get all posts
        const posts = blogManager.posts || [];
        
        // Convert dates to strings for JSON serialization
        const serializedPosts = posts.map(post => ({
            ...post,
            date: post.date instanceof Date ? post.date.toISOString().split('T')[0] : post.date
        }));
        
        // Save to JSON file
        const outputPath = join(rootDir, 'scripts', 'blog-data.json');
        writeFileSync(outputPath, JSON.stringify(serializedPosts, null, 2), 'utf-8');
        
        console.log(`Extracted ${posts.length} blog posts to blog-data.json`);
        return serializedPosts;
    } catch (error) {
        console.error('Error extracting blog data:', error);
        console.error('Stack:', error.stack);
        throw error;
    }
}

extractBlogData().catch(process.exit);

