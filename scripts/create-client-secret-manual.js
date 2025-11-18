/**
 * Manually create client_secret.json file from provided credentials
 * Usage: node scripts/create-client-secret-manual.js
 */

import { writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createClientSecret() {
    console.log('📝 手动创建 client_secret.json 文件\n');
    console.log('请提供以下信息（从 Google Cloud Console 弹窗中复制）：\n');
    
    const clientId = await question('1. 客户端 ID (Client ID): ');
    const clientSecret = await question('2. 客户端密钥 (Client Secret) [如果弹窗中有显示]: ');
    
    // Create the JSON structure
    const credentials = {
        "installed": {
            "client_id": clientId.trim(),
            "project_id": "mecollage-youtube",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": clientSecret.trim() || "",
            "redirect_uris": [
                "http://localhost"
            ]
        }
    };
    
    const filePath = join(__dirname, '../client_secret.json');
    
    try {
        writeFileSync(filePath, JSON.stringify(credentials, null, 2), 'utf8');
        console.log(`\n✅ 文件已创建: ${filePath}`);
        console.log('\n📋 文件内容预览:');
        console.log(JSON.stringify(credentials, null, 2));
        console.log('\n✅ 现在可以运行上传脚本了！');
    } catch (error) {
        console.error('❌ 创建文件失败:', error.message);
    }
    
    rl.close();
}

createClientSecret();

