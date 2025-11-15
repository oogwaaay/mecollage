// Blog Manager - Handles blog posts, categories, tags, and search
export class BlogManager {
    constructor() {
        this.posts = [
            {
                id: 'how-to-make-photo-collage',
                title: 'How to Make a Photo Collage: Complete Guide for Beginners',
                excerpt: 'Learn step-by-step how to create beautiful photo collages. Perfect for beginners who want to combine multiple photos into stunning layouts.',
                category: 'Tutorial',
                tags: ['beginner', 'tutorial', 'guide', 'how-to'],
                date: new Date().toISOString().split('T')[0], // Current date
                author: 'MeCollage Team',
                content: `
                    <h2>Introduction</h2>
                    <p>Creating a photo collage is a great way to combine multiple images into a single, stunning composition. Whether you're making a memory book, social media post, or portfolio layout, this guide will walk you through the process step by step.</p>
                    
                    <h2>Step 1: Choose Your Photos</h2>
                    <p>Start by selecting 2-20 photos that tell a story or share a theme. For best results:</p>
                    <ul>
                        <li>Choose photos with similar lighting and color tones</li>
                        <li>Select images with similar dimensions (or crop them first)</li>
                        <li>Pick photos that complement each other visually</li>
                    </ul>
                    
                    <h2>Step 2: Upload Your Images</h2>
                    <p>Using MeCollage, you can upload images in two ways:</p>
                    <ol>
                        <li><strong>Drag and Drop:</strong> Simply drag your photos into the upload area</li>
                        <li><strong>Click to Browse:</strong> Click the "Select Photos" button to choose files from your device</li>
                    </ol>
                    <p>You can upload multiple images at once - there's no limit!</p>
                    
                    <h2>Step 3: Select a Template</h2>
                    <p>MeCollage offers 20+ pre-designed templates:</p>
                    <ul>
                        <li><strong>Horizontal Layouts:</strong> Perfect for wide images and landscapes</li>
                        <li><strong>Vertical Layouts:</strong> Great for portraits and story-style sequences</li>
                        <li><strong>Grid Layouts:</strong> Classic 2x2, 3x3, 4x4, and more</li>
                        <li><strong>Custom Grids:</strong> Create your own layout up to 30x30</li>
                    </ul>
                    <p>Our AI will recommend the best templates based on your photo count!</p>
                    
                    <h2>Step 4: Customize Your Collage</h2>
                    <p>Make your collage unique with these customization options:</p>
                    <ul>
                        <li><strong>Spacing:</strong> Adjust the gap between images (0-20px)</li>
                        <li><strong>Borders:</strong> Add borders with custom colors (0-10px)</li>
                        <li><strong>Background:</strong> Choose a background color that complements your photos</li>
                        <li><strong>Filters:</strong> Apply filters to individual images or all images</li>
                        <li><strong>Text & Stickers:</strong> Add captions and decorative elements</li>
                    </ul>
                    
                    <h2>Step 5: Export Your Collage</h2>
                    <p>Once you're happy with your collage:</p>
                    <ol>
                        <li>Choose your export format (PNG for highest quality, JPG for smaller file size)</li>
                        <li>Adjust quality settings (100% for best quality)</li>
                        <li>Select aspect ratio (Original, Square, Story, or Landscape)</li>
                        <li>Click "Export Collage" to download</li>
                    </ol>
                    
                    <h2>Pro Tips</h2>
                    <ul>
                        <li>Use similar-sized images for a cleaner look</li>
                        <li>Experiment with different templates to find your style</li>
                        <li>Don't be afraid to use filters to create a cohesive look</li>
                        <li>Save your favorite templates by clicking the star icon</li>
                    </ul>
                    
                    <h2>Conclusion</h2>
                    <p>Creating a photo collage is easy with MeCollage! Start with a simple template, experiment with customization options, and soon you'll be creating stunning collages in minutes.</p>
                    
                    <p><strong>Ready to create your first collage?</strong> <a href="#home">Try MeCollage now</a> - it's completely free!</p>
                `
            },
            {
                id: 'collage-design-tips',
                title: '10 Pro Tips for Creating Stunning Photo Collages',
                excerpt: 'Master the art of collage design with these professional tips. Learn about color harmony, image arrangement, spacing techniques, and more.',
                category: 'Design Tips',
                tags: ['design', 'tips', 'professional', 'layout'],
                date: new Date().toISOString().split('T')[0], // Current date
                author: 'MeCollage Team',
                content: `
                    <h2>1. Choose a Focal Point</h2>
                    <p>Every great collage has a main focal point - one image that draws the eye first. Place your most important or visually striking photo in a prominent position, such as the center or top-left (where the eye naturally starts).</p>
                    
                    <h2>2. Maintain Visual Balance</h2>
                    <p>Balance your collage by distributing visual weight evenly. If you have one large, dark image, balance it with lighter or smaller images. Use the rule of thirds to create a more dynamic composition.</p>
                    
                    <h2>3. Create Color Harmony</h2>
                    <p>Select photos with complementary colors or use filters to create a cohesive color palette. You can:</p>
                    <ul>
                        <li>Use warm tones (reds, oranges, yellows) for a cozy feel</li>
                        <li>Use cool tones (blues, greens, purples) for a calm atmosphere</li>
                        <li>Use a monochromatic scheme for elegance</li>
                    </ul>
                    
                    <h2>4. Pay Attention to Spacing</h2>
                    <p>Proper spacing is crucial for a professional look:</p>
                    <ul>
                        <li><strong>Tight spacing (0-5px):</strong> Creates a unified, grid-like appearance</li>
                        <li><strong>Medium spacing (5-10px):</strong> Provides breathing room while maintaining cohesion</li>
                        <li><strong>Wide spacing (10-20px):</strong> Emphasizes individual images</li>
                    </ul>
                    
                    <h2>5. Use Borders Strategically</h2>
                    <p>Borders can help define images and create structure:</p>
                    <ul>
                        <li>White borders create a clean, gallery-like look</li>
                        <li>Colored borders can add personality and match your theme</li>
                        <li>Thick borders (5-10px) make images stand out more</li>
                    </ul>
                    
                    <h2>6. Tell a Story</h2>
                    <p>Arrange your photos to tell a story or show progression:</p>
                    <ul>
                        <li>Chronological order (before → after, morning → evening)</li>
                        <li>Thematic grouping (all portraits together, all landscapes together)</li>
                        <li>Visual flow (guide the eye from one image to the next)</li>
                    </ul>
                    
                    <h2>7. Mix Image Sizes</h2>
                    <p>Vary image sizes to create visual interest:</p>
                    <ul>
                        <li>Use one large image as the hero</li>
                        <li>Surround it with smaller supporting images</li>
                        <li>Create rhythm with alternating sizes</li>
                    </ul>
                    
                    <h2>8. Consider Aspect Ratios</h2>
                    <p>Match your collage's aspect ratio to its intended use:</p>
                    <ul>
                        <li><strong>Square (1:1):</strong> Perfect for Instagram posts</li>
                        <li><strong>Story (9:16):</strong> Ideal for Instagram Stories and TikTok</li>
                        <li><strong>Landscape (16:9):</strong> Great for Facebook covers and banners</li>
                    </ul>
                    
                    <h2>9. Use Filters Consistently</h2>
                    <p>Apply the same filter to all images for a cohesive look, or use filters strategically to:</p>
                    <ul>
                        <li>Unify different lighting conditions</li>
                        <li>Create a specific mood (vintage, modern, dramatic)</li>
                        <li>Match the color palette</li>
                    </ul>
                    
                    <h2>10. Add Text Thoughtfully</h2>
                    <p>When adding text overlays:</p>
                    <ul>
                        <li>Keep it minimal - less is more</li>
                        <li>Choose readable fonts and sizes</li>
                        <li>Use high contrast (light text on dark images, or vice versa)</li>
                        <li>Position text where it won't obscure important details</li>
                    </ul>
                    
                    <h2>Bonus: Practice Makes Perfect</h2>
                    <p>The best way to improve is to practice! Try different templates, experiment with filters, and don't be afraid to start over if something doesn't look right. With MeCollage, you can create unlimited collages and refine your skills.</p>
                    
                    <p><strong>Ready to apply these tips?</strong> <a href="#home">Start creating your collage</a> with MeCollage today!</p>
                `
            },
            {
                id: 'holiday-collage-guide',
                title: 'Holiday Collage Guide: Create Memorable Seasonal Collages',
                excerpt: 'Create beautiful holiday collages for Christmas, Valentine\'s Day, birthdays, and more. Discover themed templates and creative ideas.',
                category: 'Holiday',
                tags: ['holiday', 'christmas', 'valentine', 'birthday', 'seasonal'],
                date: new Date().toISOString().split('T')[0], // Current date
                author: 'MeCollage Team',
                content: `
                    <h2>Introduction</h2>
                    <p>Holiday collages are a wonderful way to preserve and share your special moments. Whether it's Christmas, Valentine's Day, birthdays, or any celebration, a well-crafted collage can capture the essence of the occasion.</p>
                    
                    <h2>Christmas Collages</h2>
                    <h3>Template Recommendations</h3>
                    <ul>
                        <li><strong>Featured Layout:</strong> Perfect for showcasing a main Christmas photo with supporting images</li>
                        <li><strong>Grid Layouts:</strong> Great for displaying multiple family photos or decorations</li>
                        <li><strong>Vertical Layouts:</strong> Ideal for Christmas tree photos and family portraits</li>
                    </ul>
                    
                    <h3>Color Schemes</h3>
                    <ul>
                        <li>Classic red and green</li>
                        <li>Elegant gold and white</li>
                        <li>Cozy warm tones (oranges, browns, deep reds)</li>
                    </ul>
                    
                    <h3>Tips</h3>
                    <ul>
                        <li>Include photos of decorations, family gatherings, and gifts</li>
                        <li>Add text overlays with holiday greetings</li>
                        <li>Use warm filters to create a cozy atmosphere</li>
                    </ul>
                    
                    <h2>Valentine's Day Collages</h2>
                    <h3>Template Recommendations</h3>
                    <ul>
                        <li><strong>Two-Column Layout:</strong> Perfect for couple photos</li>
                        <li><strong>Heart-shaped arrangements:</strong> Use custom grids to create heart shapes</li>
                        <li><strong>Featured Layout:</strong> Highlight a special moment</li>
                    </ul>
                    
                    <h3>Color Schemes</h3>
                    <ul>
                        <li>Romantic pink and red</li>
                        <li>Elegant black and white</li>
                        <li>Soft pastels (pink, lavender, peach)</li>
                    </ul>
                    
                    <h3>Tips</h3>
                    <ul>
                        <li>Focus on couple photos and romantic moments</li>
                        <li>Add sweet text messages or quotes</li>
                        <li>Use soft, dreamy filters</li>
                    </ul>
                    
                    <h2>Birthday Collages</h2>
                    <h3>Template Recommendations</h3>
                    <ul>
                        <li><strong>Grid Layouts:</strong> Showcase party photos, cake, decorations</li>
                        <li><strong>Featured Layout:</strong> Highlight the birthday person</li>
                        <li><strong>Horizontal Layout:</strong> Great for group photos</li>
                    </ul>
                    
                    <h3>Color Schemes</h3>
                    <ul>
                        <li>Bright and festive (rainbow colors)</li>
                        <li>Theme-based (match the party theme)</li>
                        <li>Age-appropriate (pastels for kids, bold for adults)</li>
                    </ul>
                    
                    <h3>Tips</h3>
                    <ul>
                        <li>Include photos from throughout the day</li>
                        <li>Add the birthday person's age as text</li>
                        <li>Use vibrant filters to match the festive mood</li>
                    </ul>
                    
                    <h2>General Holiday Collage Tips</h2>
                    <ul>
                        <li><strong>Plan Your Photos:</strong> Think about what moments you want to capture before the event</li>
                        <li><strong>Mix Photo Types:</strong> Include wide shots, close-ups, and detail shots</li>
                        <li><strong>Add Context:</strong> Include photos of decorations, food, and atmosphere</li>
                        <li><strong>Tell the Story:</strong> Arrange photos chronologically or thematically</li>
                        <li><strong>Share Immediately:</strong> Post your collage on social media while the event is fresh</li>
                    </ul>
                    
                    <h2>Seasonal Themes</h2>
                    <h3>Spring</h3>
                    <p>Use bright, fresh colors and include photos of flowers, outdoor activities, and spring celebrations.</p>
                    
                    <h3>Summer</h3>
                    <p>Capture beach trips, vacations, and outdoor fun with vibrant, sunny filters.</p>
                    
                    <h3>Fall</h3>
                    <p>Embrace warm tones (oranges, reds, browns) and include photos of fall foliage and cozy moments.</p>
                    
                    <h3>Winter</h3>
                    <p>Use cool tones and include photos of snow, winter activities, and indoor gatherings.</p>
                    
                    <h2>Conclusion</h2>
                    <p>Holiday collages are a beautiful way to preserve memories and share joy with others. With MeCollage, you can create stunning holiday collages in minutes, no matter the occasion.</p>
                    
                    <p><strong>Ready to create your holiday collage?</strong> <a href="#home">Start creating</a> with MeCollage today!</p>
                `
            },
            {
                id: 'mobile-collage-tips',
                title: 'Mobile Collage Tips: Create Collages on Your Phone',
                excerpt: 'Learn how to create professional photo collages directly on your mobile device. Tips for selecting photos and sharing on social media.',
                category: 'Mobile',
                tags: ['mobile', 'phone', 'social-media', 'tips'],
                date: new Date().toISOString().split('T')[0], // Current date
                author: 'MeCollage Team',
                content: `
                    <h2>Introduction</h2>
                    <p>Creating collages on your phone is convenient and fast. MeCollage is fully optimized for mobile devices, so you can create beautiful collages anywhere, anytime.</p>
                    
                    <h2>Getting Started on Mobile</h2>
                    <h3>1. Access MeCollage</h3>
                    <p>Simply open your mobile browser and visit <a href="https://www.mecollage.top">www.mecollage.top</a>. No app download required!</p>
                    
                    <h3>2. Upload Photos</h3>
                    <p>On mobile, you can upload photos by:</p>
                    <ul>
                        <li><strong>Tap to Browse:</strong> Tap the upload area to select photos from your gallery</li>
                        <li><strong>Camera:</strong> Take new photos directly from the camera</li>
                        <li><strong>Multiple Selection:</strong> Select multiple photos at once from your gallery</li>
                    </ul>
                    
                    <h2>Mobile-Optimized Features</h2>
                    <h3>Touch-Friendly Interface</h3>
                    <ul>
                        <li>Large, easy-to-tap buttons</li>
                        <li>Swipe gestures for navigation</li>
                        <li>Pinch-to-zoom for detailed editing</li>
                    </ul>
                    
                    <h3>Mobile Navigation</h3>
                    <p>Use the quick navigation bar at the top to jump between sections:</p>
                    <ul>
                        <li>Upload Images</li>
                        <li>Layout Templates</li>
                        <li>Decorate</li>
                        <li>Filters</li>
                        <li>Canvas</li>
                    </ul>
                    
                    <h2>Best Templates for Mobile</h2>
                    <h3>Instagram Stories (9:16)</h3>
                    <p>Perfect for vertical content:</p>
                    <ul>
                        <li>Use vertical templates</li>
                        <li>Export in Story format (9:16)</li>
                        <li>Add text at the top or bottom</li>
                    </ul>
                    
                    <h3>Instagram Posts (1:1)</h3>
                    <p>Square collages work great for Instagram:</p>
                    <ul>
                        <li>Use grid templates (2x2, 3x3)</li>
                        <li>Export in Square format (1:1)</li>
                        <li>Keep text minimal</li>
                    </ul>
                    
                    <h3>Facebook/Twitter (16:9)</h3>
                    <p>Wide collages for social feeds:</p>
                    <ul>
                        <li>Use horizontal templates</li>
                        <li>Export in Landscape format (16:9)</li>
                        <li>Perfect for cover photos</li>
                    </ul>
                    
                    <h2>Mobile Editing Tips</h2>
                    <h3>Photo Selection</h3>
                    <ul>
                        <li>Select photos with good lighting (easier to see on mobile)</li>
                        <li>Choose photos that are already oriented correctly</li>
                        <li>Use recent photos for faster loading</li>
                    </ul>
                    
                    <h3>Template Selection</h3>
                    <ul>
                        <li>Use AI recommendations for quick selection</li>
                        <li>Browse by category (All, Essentials, Grid, etc.)</li>
                        <li>Star your favorite templates for quick access</li>
                    </ul>
                    
                    <h3>Customization</h3>
                    <ul>
                        <li>Use sliders for precise adjustments (spacing, filters)</li>
                        <li>Tap to add text and stickers</li>
                        <li>Drag to reposition elements</li>
                    </ul>
                    
                    <h2>Sharing from Mobile</h2>
                    <h3>Direct Share</h3>
                    <p>After exporting:</p>
                    <ol>
                        <li>Download your collage</li>
                        <li>Use your phone's share menu</li>
                        <li>Share directly to Instagram, Facebook, Twitter, etc.</li>
                    </ol>
                    
                    <h3>Save to Gallery</h3>
                    <p>Save your collage to your phone's gallery for later sharing or editing.</p>
                    
                    <h2>Mobile Performance Tips</h2>
                    <ul>
                        <li><strong>Wi-Fi Recommended:</strong> Use Wi-Fi for faster uploads</li>
                        <li><strong>Close Other Apps:</strong> Free up memory for better performance</li>
                        <li><strong>Use WebP:</strong> MeCollage automatically uses WebP for faster loading</li>
                        <li><strong>Clear Cache:</strong> If experiencing issues, clear your browser cache</li>
                    </ul>
                    
                    <h2>Common Mobile Issues & Solutions</h2>
                    <h3>Photos Not Uploading</h3>
                    <ul>
                        <li>Check your internet connection</li>
                        <li>Try selecting fewer photos at once</li>
                        <li>Ensure photos aren't too large (under 10MB each)</li>
                    </ul>
                    
                    <h3>Slow Performance</h3>
                    <ul>
                        <li>Close other browser tabs</li>
                        <li>Use a modern browser (Chrome, Safari, Firefox)</li>
                        <li>Update your browser to the latest version</li>
                    </ul>
                    
                    <h2>Mobile-Specific Features</h2>
                    <ul>
                        <li><strong>Quick Templates:</strong> Swipe through templates quickly</li>
                        <li><strong>One-Tap Export:</strong> Fast export to your gallery</li>
                        <li><strong>Mobile Preview:</strong> See exactly how your collage will look on mobile</li>
                    </ul>
                    
                    <h2>Conclusion</h2>
                    <p>Creating collages on mobile is easy and convenient with MeCollage. Whether you're at an event, on vacation, or just want to create something quickly, our mobile-optimized interface makes it simple.</p>
                    
                    <p><strong>Try it on your phone now!</strong> Visit <a href="https://www.mecollage.top">www.mecollage.top</a> and start creating beautiful collages on the go.</p>
                `
            },
            {
                id: 'social-media-collage-guide',
                title: 'Social Media Collage Guide: Perfect Collages for Instagram, Facebook & More',
                excerpt: 'Create collages optimized for Instagram, Facebook, Twitter, and other social platforms. Learn the best sizes, formats, and design tips.',
                category: 'Social Media',
                tags: ['social-media', 'instagram', 'facebook', 'twitter', 'marketing'],
                date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
                author: 'MeCollage Team',
                content: `
                    <h2>Introduction</h2>
                    <p>Social media collages are essential for engaging your audience and telling your story visually. Each platform has its own optimal sizes and formats. This guide will help you create perfect collages for every platform.</p>
                    
                    <h2>Instagram Collages</h2>
                    <h3>Instagram Posts (Square - 1:1)</h3>
                    <ul>
                        <li><strong>Size:</strong> 1080x1080 pixels</li>
                        <li><strong>Best Templates:</strong> Grid layouts (2x2, 3x3, 4x4)</li>
                        <li><strong>Tips:</strong> Keep text minimal, use high contrast</li>
                    </ul>
                    
                    <h3>Instagram Stories (Vertical - 9:16)</h3>
                    <ul>
                        <li><strong>Size:</strong> 1080x1920 pixels</li>
                        <li><strong>Best Templates:</strong> Vertical layouts, featured layouts</li>
                        <li><strong>Tips:</strong> Add text at top/bottom (safe zones), use vibrant colors</li>
                    </ul>
                    
                    <h3>Instagram Reels (Vertical - 9:16)</h3>
                    <ul>
                        <li><strong>Size:</strong> 1080x1920 pixels</li>
                        <li><strong>Best Templates:</strong> Vertical layouts with multiple images</li>
                        <li><strong>Tips:</strong> Create before/after collages, showcase products</li>
                    </ul>
                    
                    <h2>Facebook Collages</h2>
                    <h3>Facebook Posts</h3>
                    <ul>
                        <li><strong>Size:</strong> 1200x630 pixels (recommended)</li>
                        <li><strong>Best Templates:</strong> Horizontal layouts, featured layouts</li>
                        <li><strong>Tips:</strong> Include engaging text, use clear images</li>
                    </ul>
                    
                    <h3>Facebook Cover Photo</h3>
                    <ul>
                        <li><strong>Size:</strong> 1640x859 pixels</li>
                        <li><strong>Best Templates:</strong> Wide horizontal layouts</li>
                        <li><strong>Tips:</strong> Keep important content in center (mobile crop area)</li>
                    </ul>
                    
                    <h2>Twitter/X Collages</h2>
                    <ul>
                        <li><strong>Size:</strong> 1200x675 pixels (recommended)</li>
                        <li><strong>Best Templates:</strong> Horizontal layouts, 2-column layouts</li>
                        <li><strong>Tips:</strong> Keep it simple, high contrast for visibility</li>
                    </ul>
                    
                    <h2>Pinterest Collages</h2>
                    <ul>
                        <li><strong>Size:</strong> 1000x1500 pixels (vertical, 2:3 ratio)</li>
                        <li><strong>Best Templates:</strong> Vertical layouts, grid layouts</li>
                        <li><strong>Tips:</strong> Use bright, eye-catching colors, include text overlays</li>
                    </ul>
                    
                    <h2>General Social Media Tips</h2>
                    <ul>
                        <li><strong>Brand Consistency:</strong> Use consistent colors and filters</li>
                        <li><strong>Text Readability:</strong> Ensure text is readable on small screens</li>
                        <li><strong>Call to Action:</strong> Include clear CTAs in your collages</li>
                        <li><strong>Hashtags:</strong> Leave space for hashtags in your design</li>
                    </ul>
                    
                    <h2>Conclusion</h2>
                    <p>With MeCollage, you can create platform-optimized collages quickly and easily. Just select the right aspect ratio, choose a template, and export!</p>
                `
            },
            {
                id: 'portfolio-collage-tips',
                title: 'Portfolio Collage Tips: Showcase Your Work Professionally',
                excerpt: 'Learn how to create professional portfolio collages that showcase your photography, design, or artwork effectively.',
                category: 'Portfolio',
                tags: ['portfolio', 'professional', 'showcase', 'photography'],
                date: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
                author: 'MeCollage Team',
                content: `
                    <h2>Introduction</h2>
                    <p>A well-crafted portfolio collage can showcase multiple pieces of your work in a single, impactful image. Whether you're a photographer, designer, or artist, collages are an excellent way to display your range and style.</p>
                    
                    <h2>Portfolio Collage Best Practices</h2>
                    <h3>1. Choose Your Best Work</h3>
                    <p>Select 4-12 of your strongest pieces that represent your style and range. Quality over quantity!</p>
                    
                    <h3>2. Maintain Consistency</h3>
                    <ul>
                        <li>Use similar lighting and color tones</li>
                        <li>Apply consistent filters</li>
                        <li>Keep the same style or theme</li>
                    </ul>
                    
                    <h3>3. Create Visual Flow</h3>
                    <p>Arrange images so the eye moves naturally through the collage. Use:</p>
                    <ul>
                        <li>Symmetrical layouts for balance</li>
                        <li>Asymmetrical layouts for dynamism</li>
                        <li>Featured layouts to highlight your best piece</li>
                    </ul>
                    
                    <h2>Template Recommendations</h2>
                    <ul>
                        <li><strong>Grid Layouts:</strong> Clean, professional, easy to scan</li>
                        <li><strong>Featured Layouts:</strong> Highlight one piece with supporting images</li>
                        <li><strong>Custom Grids:</strong> Create unique arrangements</li>
                    </ul>
                    
                    <h2>Export Settings for Portfolios</h2>
                    <ul>
                        <li><strong>Format:</strong> PNG for highest quality</li>
                        <li><strong>Quality:</strong> 100%</li>
                        <li><strong>Size:</strong> Original or high resolution</li>
                    </ul>
                    
                    <h2>Conclusion</h2>
                    <p>Portfolio collages are a powerful way to showcase your work. With MeCollage, you can create professional portfolio collages in minutes.</p>
                `
            }
        ];
        
        this.categories = ['All', 'Tutorial', 'Design Tips', 'Holiday', 'Mobile', 'Social Media', 'Portfolio'];
        // Note: Categories will be translated via i18n in the UI
        this.currentCategory = 'All';
        this.searchQuery = '';
        this.currentPost = null;
    }
    
    getAllPosts() {
        return this.posts;
    }
    
    getPostById(id) {
        return this.posts.find(post => post.id === id);
    }
    
    getPostsByCategory(category) {
        if (category === 'All') {
            return this.posts;
        }
        return this.posts.filter(post => post.category === category);
    }
    
    searchPosts(query) {
        if (!query) {
            return this.posts;
        }
        const lowerQuery = query.toLowerCase();
        return this.posts.filter(post => 
            post.title.toLowerCase().includes(lowerQuery) ||
            post.excerpt.toLowerCase().includes(lowerQuery) ||
            post.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            post.category.toLowerCase().includes(lowerQuery)
        );
    }
    
    getFilteredPosts() {
        let filtered = this.posts;
        
        // Apply category filter
        if (this.currentCategory !== 'All') {
            filtered = filtered.filter(post => post.category === this.currentCategory);
        }
        
        // Apply search filter
        if (this.searchQuery) {
            const lowerQuery = this.searchQuery.toLowerCase();
            filtered = filtered.filter(post => 
                post.title.toLowerCase().includes(lowerQuery) ||
                post.excerpt.toLowerCase().includes(lowerQuery) ||
                post.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
                post.category.toLowerCase().includes(lowerQuery)
            );
        }
        
        return filtered;
    }
    
    getCategories() {
        return this.categories;
    }
    
    getAllTags() {
        const allTags = new Set();
        this.posts.forEach(post => {
            post.tags.forEach(tag => allTags.add(tag));
        });
        return Array.from(allTags).sort();
    }
}

export const blogManager = new BlogManager();

