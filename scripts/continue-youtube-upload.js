/**
 * Continue YouTube upload with authorization code
 */

import { google } from 'googleapis';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUTH_CODE = '4/0Ab32j91qDmDvKjCw4s0BwewSgwQFgpMFocr-aEvE9ZH4uRTyE9nvKflDqPX9BzMY-zSZeA';
const VIDEO_PATH = join(__dirname, '../demo.webm');
const CREDENTIALS_PATH = join(__dirname, '../client_secret.json');
const TOKEN_PATH = join(__dirname, '../youtube_token.json');

async function uploadVideo() {
    console.log('🎬 继续 YouTube 上传流程...\n');
    
    // Load credentials
    if (!existsSync(CREDENTIALS_PATH)) {
        throw new Error('client_secret.json not found');
    }
    
    const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    const oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0] || 'http://localhost'
    );
    
    // Exchange authorization code for tokens
    console.log('🔐 使用授权码获取访问令牌...');
    console.log(`授权码: ${AUTH_CODE.substring(0, 20)}...`);
    
    try {
        const { tokens } = await oauth2Client.getToken(AUTH_CODE.trim());
        oauth2Client.setCredentials(tokens);
        
        // Save token for future use
        const fs = await import('fs/promises');
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ 令牌已保存，下次无需重新授权\n');
    } catch (error) {
        console.error('❌ 获取令牌失败:', error.message);
        if (error.response) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.error('\n⚠️  网络连接问题。请检查：');
            console.error('   1. 网络连接是否正常');
            console.error('   2. 防火墙是否阻止了连接');
            console.error('   3. 代理设置是否正确');
        }
        throw error;
    }
    
    // Upload video
    console.log('📤 开始上传视频到 YouTube...');
    console.log(`📹 视频文件: ${VIDEO_PATH}`);
    
    if (!existsSync(VIDEO_PATH)) {
        throw new Error(`Video file not found: ${VIDEO_PATH}`);
    }
    
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    const videoMetadata = {
        snippet: {
            title: 'MeCollage - Free Online Image Collage Maker',
            description: `MeCollage is a free online image collage maker. Upload multiple images, choose from templates or create custom grids, adjust spacing and borders, add text and stickers, then export as PNG or JPG. No registration, no watermarks, completely free.

Features:
- Support for 20+ images
- Multiple layout templates (horizontal, vertical, grid)
- Custom grid layouts (up to 30×30)
- Drag and drop upload
- Real-time preview
- Filters and decorations
- High quality export

Try it now: https://www.mecollage.top`,
            tags: ['collage maker', 'photo collage', 'image collage', 'online collage maker', 'free collage maker'],
            categoryId: '22' // People & Blogs
        },
        status: {
            privacyStatus: 'unlisted',
            selfDeclaredMadeForKids: false
        }
    };
    
    const videoFile = readFileSync(VIDEO_PATH);
    
    try {
        const response = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: videoMetadata,
            media: {
                body: videoFile,
                mimeType: 'video/webm'
            }
        });
        
        const videoId = response.data.id;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        console.log('\n✅ 视频上传成功！');
        console.log(`\n📎 YouTube URL: ${videoUrl}`);
        console.log(`🆔 Video ID: ${videoId}`);
        console.log(`🔒 隐私设置: 不公开列出 (unlisted)`);
        console.log('\n💡 提示: 视频可能需要几分钟时间处理，之后才能正常播放');
        
        return { videoId, videoUrl };
    } catch (error) {
        console.error('❌ 上传失败:', error.message);
        if (error.response) {
            console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
            
            // Check if it's a format issue
            if (error.response.data.error?.message?.includes('format') || 
                error.response.data.error?.message?.includes('codec')) {
                console.error('\n⚠️  可能是视频格式问题。YouTube 推荐 MP4 格式。');
                console.error('💡 建议: 将 WebM 转换为 MP4 后重新上传');
            }
        }
        throw error;
    }
}

uploadVideo()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ 错误:', error.message);
        process.exit(1);
    });

