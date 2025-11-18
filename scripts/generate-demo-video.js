/**
 * Generate a demo video of mecollage tool using Playwright
 * Records screen interactions and uploads to Cloudinary
 * 
 * Usage:
 *   node scripts/generate-demo-video.js [options]
 * 
 * Options:
 *   --url <url>        URL to record (default: http://localhost:5173)
 *   --width <width>    Viewport width (default: 1920)
 *   --height <height>  Viewport height (default: 1080)
 *   --duration <sec>   Video duration in seconds (default: 30)
 *   --output <path>    Save video locally (optional)
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
    url: getArg('--url', 'https://www.mecollage.top'),
    width: parseInt(getArg('--width', '1920')),
    height: parseInt(getArg('--height', '1080')),
    duration: parseInt(getArg('--duration', '30')),
    output: getArg('--output', null)
};

async function uploadVideoToCloudinary(videoBuffer) {
    const fileName = `mecollage-demo-${Date.now()}.webm`; // Playwright records as WebM
    
    // Try native FormData first (Node.js 18+), fallback to form-data package
    let FormData, formData, headers = {};
    
    if (globalThis.FormData) {
        // Use native FormData (Node.js 18+)
        FormData = globalThis.FormData;
        formData = new FormData();
        
        // Create a Blob from buffer for native FormData
        const blob = new Blob([videoBuffer], { type: 'video/webm' });
        formData.append('file', blob, fileName);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'videos');
        formData.append('tags', 'mecollage,demo,video');
    } else {
        // Fallback to form-data package
        const FormDataModule = await import('form-data');
        FormData = FormDataModule.default || FormDataModule.FormData;
        formData = new FormData();
        
        formData.append('file', videoBuffer, {
            filename: fileName,
            contentType: 'video/webm'
        });
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'videos');
        formData.append('tags', 'mecollage,demo,video');
        
        headers = formData.getHeaders();
    }
    
    // Use video upload endpoint
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
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
        duration: data.duration,
        format: data.format
    };
}

async function generateDemoVideo() {
    console.log('🎬 Starting demo video generation...');
    console.log(`📹 URL: ${config.url}`);
    console.log(`📐 Viewport: ${config.width}x${config.height}`);
    console.log(`⏱️  Duration: ${config.duration} seconds`);
    
        const browser = await chromium.launch({
        headless: true // Can be headless, video recording works in headless mode
    });

    try {
        const context = await browser.newContext({
            viewport: {
                width: config.width,
                height: config.height
            },
            recordVideo: {
                dir: join(__dirname, '../temp-videos'),
                size: {
                    width: config.width,
                    height: config.height
                }
            }
        });
        
        const page = await context.newPage();

        // Navigate to URL
        console.log('⏳ Loading page...');
        await page.goto(config.url, {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // Wait for page to fully load
        await page.waitForTimeout(2000);

        console.log('🎥 Recording demo interactions...');
        
        // Demo sequence: Show the tool in action
        const steps = [
            // Step 1: Show homepage (3 seconds)
            { action: 'wait', duration: 3000 },
            
            // Step 2: Scroll down to show features
            { action: 'scroll', y: 200 },
            { action: 'wait', duration: 1000 },
            
            // Step 3: Click on Features
            { action: 'click', selector: 'a[href="/features"]' },
            { action: 'wait', duration: 2000 },
            
            // Step 4: Scroll through features
            { action: 'scroll', y: 500 },
            { action: 'wait', duration: 2000 },
            
            // Step 5: Go back to home
            { action: 'click', selector: 'a[href="/"]' },
            { action: 'wait', duration: 2000 },
            
            // Step 6: Show upload area
            { action: 'scroll', y: 0 },
            { action: 'wait', duration: 2000 },
            
            // Step 7: Hover over upload button
            { action: 'hover', selector: '#uploadCtaBtn' },
            { action: 'wait', duration: 1000 },
            
            // Step 8: Show templates section
            { action: 'scroll', y: 300 },
            { action: 'wait', duration: 2000 },
        ];

        // Execute demo steps
        for (const step of steps) {
            try {
                switch (step.action) {
                    case 'wait':
                        await page.waitForTimeout(step.duration);
                        break;
                    case 'scroll':
                        await page.evaluate((y) => {
                            window.scrollTo({ top: y, behavior: 'smooth' });
                        }, step.y);
                        await page.waitForTimeout(1000); // Wait for scroll animation
                        break;
                    case 'click':
                        await page.click(step.selector, { timeout: 5000 });
                        break;
                    case 'hover':
                        await page.hover(step.selector, { timeout: 5000 });
                        break;
                }
            } catch (error) {
                console.warn(`⚠️  Step failed: ${step.action}`, error.message);
                // Continue with next step
            }
        }

        // Wait for remaining duration
        const elapsed = config.duration * 1000;
        const remaining = Math.max(0, elapsed - (steps.length * 2000));
        if (remaining > 0) {
            await page.waitForTimeout(remaining);
        }

        console.log('✅ Recording complete, closing browser...');
        
        // Close context to finalize video
        await context.close();

        // Wait a moment for video file to be written
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Find the video file
        const fs = await import('fs/promises');
        const path = await import('path');
        const tempDir = join(__dirname, '../temp-videos');
        
        try {
            const files = await fs.readdir(tempDir);
            const videoFile = files.find(f => f.endsWith('.webm'));
            
            if (!videoFile) {
                throw new Error('Video file not found');
            }
            
            const videoPath = path.join(tempDir, videoFile);
            console.log(`📹 Video saved: ${videoPath}`);
            
            // Read video file
            const videoBuffer = await fs.readFile(videoPath);
            
            // Save locally if requested
            if (config.output) {
                await fs.writeFile(config.output, videoBuffer);
                console.log(`💾 Saved locally: ${config.output}`);
            }
            
            // Convert WebM to MP4 (Cloudinary can handle WebM, but MP4 is more compatible)
            // For now, upload WebM directly - Cloudinary supports it
            console.log('☁️  Uploading to Cloudinary...');
            const result = await uploadVideoToCloudinary(videoBuffer);

            console.log('\n✅ Demo video generated and uploaded successfully!');
            console.log(`\n📎 Video URL: ${result.url}`);
            console.log(`🆔 Public ID: ${result.publicId}`);
            console.log(`📐 Dimensions: ${result.width}x${result.height}`);
            console.log(`⏱️  Duration: ${result.duration}s`);
            console.log(`🎨 Format: ${result.format.toUpperCase()}`);

            // Clean up temp file
            try {
                await fs.unlink(videoPath);
                console.log('🧹 Cleaned up temporary video file');
            } catch (e) {
                console.warn('⚠️  Could not delete temp file:', e.message);
            }

            return result;
        } catch (error) {
            console.error('❌ Error processing video:', error);
            throw error;
        }
    } finally {
        await browser.close();
    }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('generate-demo-video.js')) {
    generateDemoVideo()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

export { generateDemoVideo };

