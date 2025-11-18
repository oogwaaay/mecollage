/**
 * Generate a screenshot of mecollage tool and upload to Cloudinary
 * Returns a PNG or JPG image URL
 * 
 * Usage:
 *   node scripts/generate-screenshot.js [options]
 * 
 * Options:
 *   --url <url>        URL to screenshot (default: http://localhost:5173)
 *   --format <format>  Image format: png or jpg (default: png)
 *   --width <width>    Viewport width (default: 1920)
 *   --height <height>  Viewport height (default: 1080)
 *   --wait <ms>        Wait time in ms after page load (default: 3000)
 *   --selector <sel>   CSS selector to screenshot (default: entire page)
 *   --output <path>    Save screenshot locally (optional)
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cloudinary configuration
const CLOUD_NAME = 'dztbpf6ke';
const UPLOAD_PRESET = 'public_works_unsigned';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (key, defaultValue) => {
    const index = args.indexOf(key);
    return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const config = {
    url: getArg('--url', 'http://localhost:5173'),
    format: getArg('--format', 'png'),
    width: parseInt(getArg('--width', '1920')),
    height: parseInt(getArg('--height', '1080')),
    wait: parseInt(getArg('--wait', '3000')),
    selector: getArg('--selector', null),
    output: getArg('--output', null)
};

// Validate format
if (!['png', 'jpg', 'jpeg'].includes(config.format.toLowerCase())) {
    console.error('Error: Format must be png, jpg, or jpeg');
    process.exit(1);
}

async function uploadToCloudinary(buffer, format) {
    const fileName = `mecollage-screenshot-${Date.now()}.${format}`;
    
    // Try native FormData first (Node.js 18+), fallback to form-data package
    let FormData, formData, headers = {};
    
    if (globalThis.FormData) {
        // Use native FormData (Node.js 18+)
        FormData = globalThis.FormData;
        formData = new FormData();
        
        // Create a Blob from buffer for native FormData
        const blob = new Blob([buffer], { type: format === 'png' ? 'image/png' : 'image/jpeg' });
        formData.append('file', blob, fileName);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'screenshots');
        formData.append('tags', 'mecollage,screenshot');
    } else {
        // Fallback to form-data package
        const FormDataModule = await import('form-data');
        FormData = FormDataModule.default || FormDataModule.FormData;
        formData = new FormData();
        
        formData.append('file', buffer, {
            filename: fileName,
            contentType: format === 'png' ? 'image/png' : 'image/jpeg'
        });
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'screenshots');
        formData.append('tags', 'mecollage,screenshot');
        
        headers = formData.getHeaders();
    }
    
    // Use native fetch (Node 18+)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
        headers: headers
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
        url: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
        format: data.format
    };
}

async function generateScreenshot() {
    console.log('🚀 Starting screenshot generation...');
    console.log(`📸 URL: ${config.url}`);
    console.log(`📐 Viewport: ${config.width}x${config.height}`);
    console.log(`🎨 Format: ${config.format.toUpperCase()}`);
    
    const browser = await chromium.launch({
        headless: true
    });

    try {
        const context = await browser.newContext({
            viewport: {
                width: config.width,
                height: config.height
            },
            deviceScaleFactor: 2 // Higher quality
        });
        
        const page = await context.newPage();

        // Navigate to URL
        console.log('⏳ Loading page...');
        await page.goto(config.url, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait for additional time to ensure everything is loaded
        if (config.wait > 0) {
            console.log(`⏳ Waiting ${config.wait}ms for page to fully render...`);
            await page.waitForTimeout(config.wait);
        }

        // Take screenshot
        console.log('📷 Taking screenshot...');
        let screenshot;
        
        if (config.selector) {
            // Screenshot specific element
            const element = await page.locator(config.selector).first();
            if (!(await element.count())) {
                throw new Error(`Element not found: ${config.selector}`);
            }
            screenshot = await element.screenshot({
                type: config.format,
                quality: config.format === 'jpg' || config.format === 'jpeg' ? 90 : undefined
            });
        } else {
            // Get actual visible content height to avoid white space at bottom
            const contentInfo = await page.evaluate(() => {
                // Find the main content container
                const appContainer = document.querySelector('.app-container');
                const header = document.querySelector('.ghibli-header');
                const mainContent = document.querySelector('.page-content');
                
                if (appContainer) {
                    const rect = appContainer.getBoundingClientRect();
                    const scrollHeight = appContainer.scrollHeight;
                    const clientHeight = appContainer.clientHeight;
                    
                    // Get the bottom of the last visible element
                    let lastElementBottom = 0;
                    const allElements = appContainer.querySelectorAll('*');
                    allElements.forEach(el => {
                        const elRect = el.getBoundingClientRect();
                        if (elRect.bottom > lastElementBottom && elRect.bottom <= window.innerHeight + 100) {
                            lastElementBottom = elRect.bottom;
                        }
                    });
                    
                    // Use the actual visible content height
                    return {
                        height: Math.max(window.innerHeight, lastElementBottom || scrollHeight || clientHeight),
                        scrollHeight: scrollHeight
                    };
                }
                
                // Fallback to document dimensions
                return {
                    height: Math.max(
                        window.innerHeight,
                        document.body.scrollHeight,
                        document.documentElement.scrollHeight
                    ),
                    scrollHeight: document.documentElement.scrollHeight
                };
            });
            
            // Calculate optimal screenshot height (viewport height + a bit for content, but not too much)
            const optimalHeight = Math.min(
                Math.max(config.height, contentInfo.height),
                config.height * 2 // Cap at 2x viewport to avoid too much white space
            );
            
            // Screenshot with clip to exact content height
            screenshot = await page.screenshot({
                type: config.format,
                fullPage: false, // Don't use fullPage to avoid white space
                clip: {
                    x: 0,
                    y: 0,
                    width: config.width,
                    height: optimalHeight
                },
                quality: config.format === 'jpg' || config.format === 'jpeg' ? 90 : undefined
            });
        }

        // Save locally if requested
        if (config.output) {
            const fs = await import('fs/promises');
            await fs.writeFile(config.output, screenshot);
            console.log(`💾 Saved locally: ${config.output}`);
        }

        // Upload to Cloudinary
        console.log('☁️  Uploading to Cloudinary...');
        const result = await uploadToCloudinary(screenshot, config.format);

        console.log('\n✅ Screenshot generated and uploaded successfully!');
        console.log(`\n📎 Image URL: ${result.url}`);
        console.log(`🆔 Public ID: ${result.publicId}`);
        console.log(`📐 Dimensions: ${result.width}x${result.height}`);
        console.log(`🎨 Format: ${result.format.toUpperCase()}`);

        return result;
    } finally {
        await browser.close();
    }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('generate-screenshot.js')) {
    generateScreenshot()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

export { generateScreenshot };

