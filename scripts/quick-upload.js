import { google } from 'googleapis';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AUTH_CODE = '4/0Ab32j92IUFxgfqlaPbOSwst-wonj27nXRYNnmzhjBXC9EHNhYrWBzdTSHT1_RZhsApxwGQ';
const VIDEO_PATH = join(__dirname, '../demo.webm');
const CREDENTIALS_PATH = join(__dirname, '../client_secret.json');
const TOKEN_PATH = join(__dirname, '../youtube_token.json');

async function quickUpload() {
    console.log('🚀 快速上传到 YouTube...\n');
    
    // Load credentials
    const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    const oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0] || 'http://localhost'
    );
    
    // Get token
    console.log('🔐 获取访问令牌...');
    const { tokens } = await oauth2Client.getToken(AUTH_CODE.trim());
    oauth2Client.setCredentials(tokens);
    
    const fs = await import('fs/promises');
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log('✅ 令牌已保存\n');
    
    // Upload
    console.log('📤 上传视频...');
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const videoFile = readFileSync(VIDEO_PATH);
    
    const response = await youtube.videos.insert({
        part: 'snippet,status',
        requestBody: {
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
                categoryId: '22'
            },
            status: {
                privacyStatus: 'unlisted',
                selfDeclaredMadeForKids: false
            }
        },
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
    console.log(`🔒 隐私: 不公开列出`);
}

quickUpload().catch(err => {
    console.error('❌ 错误:', err.message);
    if (err.response) {
        console.error('详情:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
});

