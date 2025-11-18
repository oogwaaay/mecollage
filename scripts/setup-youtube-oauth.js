/**
 * Interactive YouTube OAuth Setup Assistant
 * Guides user through the OAuth setup process step by step
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🎬 YouTube OAuth 设置助手\n');
console.log('这个工具会引导你完成 Google OAuth 设置，只需 5 分钟！\n');

const steps = [
    {
        title: '步骤 1: 创建 Google Cloud 项目',
        instructions: [
            '1. 访问: https://console.cloud.google.com/',
            '2. 点击 "选择项目" → "新建项目"',
            '3. 项目名称: mecollage-youtube (或任意名称)',
            '4. 点击 "创建"',
            '',
            '完成后按 Enter 继续...'
        ]
    },
    {
        title: '步骤 2: 启用 YouTube Data API',
        instructions: [
            '1. 在左侧菜单选择 "API 和服务" → "库"',
            '2. 搜索 "YouTube Data API v3"',
            '3. 点击进入，然后点击 "启用"',
            '',
            '完成后按 Enter 继续...'
        ]
    },
    {
        title: '步骤 3: 配置 OAuth 同意屏幕',
        instructions: [
            '1. 进入 "API 和服务" → "OAuth 同意屏幕"',
            '2. 用户类型: 选择 "外部" → "创建"',
            '3. 应用信息:',
            '   - 应用名称: MeCollage Uploader',
            '   - 用户支持电子邮件: 你的邮箱',
            '   - 开发者联系信息: 你的邮箱',
            '4. 点击 "保存并继续"',
            '5. 作用域: 点击 "添加或移除作用域"',
            '   - 搜索 "youtube.upload"',
            '   - 勾选 "https://www.googleapis.com/auth/youtube.upload"',
            '   - 点击 "更新" → "保存并继续"',
            '6. 测试用户: 添加你的 Google 账号邮箱',
            '7. 点击 "保存并继续" → "返回到信息中心"',
            '',
            '完成后按 Enter 继续...'
        ]
    },
    {
        title: '步骤 4: 创建 OAuth 客户端 ID',
        instructions: [
            '1. 进入 "API 和服务" → "凭据"',
            '2. 点击 "创建凭据" → "OAuth 客户端 ID"',
            '3. 应用类型: 选择 "桌面应用"',
            '4. 名称: MeCollage Uploader',
            '5. 点击 "创建"',
            '6. 点击 "下载 JSON"',
            '7. 将下载的文件重命名为 client_secret.json',
            '8. 将文件放到项目根目录 (mecollage 文件夹)',
            '',
            '完成后按 Enter 继续...'
        ]
    }
];

async function waitForEnter() {
    const readline = await import('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('', () => {
            rl.close();
            resolve();
        });
    });
}

async function setup() {
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        console.log(`\n${'='.repeat(60)}`);
        console.log(`${step.title}`);
        console.log('='.repeat(60));
        console.log();
        
        step.instructions.forEach(line => console.log(line));
        console.log();
        
        // Open browser for first step
        if (i === 0) {
            console.log('🌐 正在打开浏览器...');
            try {
                await open('https://console.cloud.google.com/');
            } catch (e) {
                console.log('⚠️  无法自动打开浏览器，请手动访问上面的链接');
            }
        }
        
        await waitForEnter();
    }
    
    // Check if credentials file exists
    const credentialsPath = join(__dirname, '../client_secret.json');
    console.log('\n' + '='.repeat(60));
    console.log('验证设置');
    console.log('='.repeat(60));
    
    if (existsSync(credentialsPath)) {
        try {
            const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
            const hasClientId = credentials.installed?.client_id || credentials.web?.client_id;
            
            if (hasClientId) {
                console.log('✅ OAuth 凭据文件已找到！');
                console.log('✅ 设置完成！现在可以运行上传脚本了。\n');
                console.log('📝 下一步:');
                console.log('   npm run upload-youtube -- --video <视频路径>');
                return true;
            } else {
                console.log('❌ 凭据文件格式不正确');
                return false;
            }
        } catch (e) {
            console.log('❌ 无法读取凭据文件:', e.message);
            return false;
        }
    } else {
        console.log('❌ 未找到 client_secret.json 文件');
        console.log('   请确保文件已下载并放在项目根目录');
        return false;
    }
}

setup()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('❌ 错误:', error);
        process.exit(1);
    });

