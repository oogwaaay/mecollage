/**
 * Upload demo video to YouTube using YouTube Data API v3
 * 
 * Prerequisites:
 * 1. Create a Google Cloud Project
 * 2. Enable YouTube Data API v3
 * 3. Create OAuth 2.0 credentials (Desktop app)
 * 4. Download credentials as client_secret.json
 * 5. Install dependencies: npm install googleapis fluent-ffmpeg
 * 
 * Usage:
 *   node scripts/upload-to-youtube.js [options]
 * 
 * Options:
 *   --video <path>     Path to video file (default: generate new demo video)
 *   --title <title>    Video title (default: "MeCollage - Free Online Image Collage Maker")
 *   --description <desc> Video description
 *   --tags <tags>      Comma-separated tags
 *   --privacy <level>  Privacy level: public, unlisted, private (default: unlisted)
 *   --credentials <path> Path to OAuth credentials (default: ./client_secret.json)
 */

import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Note: We'll generate video separately or use existing file
// import { generateDemoVideo } from './generate-demo-video.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (key, defaultValue) => {
    const index = args.indexOf(key);
    return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const config = {
    videoPath: getArg('--video', null),
    title: getArg('--title', 'MeCollage - Free Online Image Collage Maker'),
    description: getArg('--description', `MeCollage is a free online image collage maker. Upload multiple images, choose from templates or create custom grids, adjust spacing and borders, add text and stickers, then export as PNG or JPG. No registration, no watermarks, completely free.

Features:
- Support for 20+ images
- Multiple layout templates (horizontal, vertical, grid)
- Custom grid layouts (up to 30×30)
- Drag and drop upload
- Real-time preview
- Filters and decorations
- High quality export

Try it now: https://www.mecollage.top`),
    tags: getArg('--tags', 'collage maker,photo collage,image collage,online collage maker,free collage maker,photo grid,image editor').split(','),
    privacy: getArg('--privacy', 'unlisted'), // public, unlisted, or private
    credentialsPath: getArg('--credentials', join(__dirname, '../client_secret.json')),
    authCode: getArg('--code', null) // Optional: provide auth code directly
};

// OAuth2 client setup
async function getAuthenticatedClient() {
    if (!existsSync(config.credentialsPath)) {
        throw new Error(`OAuth credentials not found at ${config.credentialsPath}\n\nPlease:\n1. Go to https://console.cloud.google.com/\n2. Create a project and enable YouTube Data API v3\n3. Create OAuth 2.0 credentials (Desktop app)\n4. Download as client_secret.json\n5. Place it in the project root`);
    }

    const credentials = JSON.parse(readFileSync(config.credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    const oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0] || 'http://localhost:3000/oauth2callback'
    );

    // Check if we have stored token
    const tokenPath = join(__dirname, '../youtube_token.json');
    let token;
    
    if (existsSync(tokenPath)) {
        token = JSON.parse(readFileSync(tokenPath, 'utf8'));
        oauth2Client.setCredentials(token);
    } else {
        // Get new token
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/youtube.upload']
        });
        
        console.log('🔐 Authorization required!');
        console.log('📋 Please visit this URL to authorize the application:');
        console.log(`\n${authUrl}\n`);
        console.log('After authorization, you will be redirected. Copy the code from the URL and paste it here.');
        
        // In a real scenario, you'd use a web server or manual copy-paste
        // For now, we'll use a simple prompt (requires readline)
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        let code;
        if (config.authCode) {
            // Use provided auth code
            code = config.authCode;
            console.log('✅ Using provided authorization code');
        } else {
            // Prompt for auth code
            code = await new Promise((resolve) => {
                rl.question('Enter the authorization code: ', (answer) => {
                    rl.close();
                    resolve(answer);
                });
            });
        }
        
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        // Save token for future use
        const fs = await import('fs/promises');
        await fs.writeFile(tokenPath, JSON.stringify(tokens));
        console.log('✅ Token saved for future use');
    }
    
    return oauth2Client;
}

// Convert WebM to MP4 (YouTube requires MP4)
// Note: This requires ffmpeg to be installed on the system
async function convertToMP4(webmPath) {
    console.log('⚠️  WebM format detected. YouTube requires MP4.');
    console.log('💡 Options:');
    console.log('   1. Install ffmpeg and use conversion (recommended)');
    console.log('   2. Use Cloudinary to convert: Upload WebM, then download as MP4');
    console.log('   3. Manually convert using online tools or video software');
    console.log('\n📝 For now, trying to upload WebM directly (may fail)...');
    
    // YouTube API might accept WebM, but MP4 is more reliable
    // Return original path and let YouTube API handle it
    return webmPath;
    
    // Uncomment below if you have ffmpeg installed:
    /*
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const path = await import('path');
        
        const mp4Path = webmPath.replace(/\.webm$/, '.mp4');
        
        console.log('🔄 Converting WebM to MP4 using ffmpeg...');
        
        await execAsync(`ffmpeg -i "${webmPath}" -c:v libx264 -c:a aac "${mp4Path}"`);
        
        console.log('✅ Conversion complete');
        return mp4Path;
    } catch (error) {
        throw new Error('FFmpeg conversion failed. Please install ffmpeg: https://ffmpeg.org/download.html');
    }
    */
}

// Upload video to YouTube
async function uploadToYouTube(videoPath, oauth2Client) {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    console.log('📤 Uploading to YouTube...');
    console.log(`📹 Title: ${config.title}`);
    console.log(`🔒 Privacy: ${config.privacy}`);
    
    const requestParameters = {
        part: 'snippet,status',
        requestBody: {
            snippet: {
                title: config.title,
                description: config.description,
                tags: config.tags,
                categoryId: '22' // People & Blogs category
            },
            status: {
                privacyStatus: config.privacy,
                selfDeclaredMadeForKids: false
            }
        },
        media: {
            body: readFileSync(videoPath)
        }
    };
    
    try {
        const response = await youtube.videos.insert(requestParameters);
        const videoId = response.data.id;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        console.log('\n✅ Video uploaded successfully!');
        console.log(`\n📎 YouTube URL: ${videoUrl}`);
        console.log(`🆔 Video ID: ${videoId}`);
        
        return { videoId, videoUrl };
    } catch (error) {
        console.error('❌ Upload error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        throw error;
    }
}

// Main function
async function uploadVideoToYouTube() {
    try {
        console.log('🎬 Starting YouTube upload process...\n');
        
        // Step 1: Get or generate video
        let videoPath = config.videoPath;
        
        if (!videoPath) {
            console.log('📹 No video path provided.');
            console.log('💡 Please either:');
            console.log('   1. Run: npm run demo-video -- --output ./demo.webm');
            console.log('   2. Then: npm run upload-youtube -- --video ./demo.webm');
            console.log('\n   Or provide a video path: --video <path>');
            throw new Error('Video path required. Generate a demo video first or provide --video path');
        }
        
        if (!existsSync(videoPath)) {
            throw new Error(`Video file not found: ${videoPath}`);
        }
        
        // Step 2: Convert to MP4 if needed
        if (videoPath.endsWith('.webm')) {
            videoPath = await convertToMP4(videoPath);
        }
        
        // Step 3: Authenticate
        const oauth2Client = await getAuthenticatedClient();
        
        // Step 4: Upload
        const result = await uploadToYouTube(videoPath, oauth2Client);
        
        // Step 5: Cleanup (optional)
        if (videoPath.includes('temp-videos')) {
            const fs = await import('fs/promises');
            try {
                await fs.unlink(videoPath);
                if (videoPath.replace(/\.mp4$/, '.webm')) {
                    const webmPath = videoPath.replace(/\.mp4$/, '.webm');
                    if (existsSync(webmPath)) {
                        await fs.unlink(webmPath);
                    }
                }
                console.log('🧹 Cleaned up temporary files');
            } catch (e) {
                console.warn('⚠️  Could not delete temp files:', e.message);
            }
        }
        
        return result;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('upload-to-youtube.js')) {
    uploadVideoToYouTube()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

export { uploadVideoToYouTube };

