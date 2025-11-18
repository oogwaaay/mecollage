/**
 * Troubleshooting guide for YouTube Data API v3 setup
 */

console.log('🔍 YouTube Data API 启用问题排查\n');
console.log('='.repeat(60));
console.log('常见问题及解决方案：\n');

const issues = [
    {
        problem: '找不到 "YouTube Data API v3"',
        solutions: [
            '1. 确保已选择正确的项目（右上角项目选择器）',
            '2. 尝试直接访问: https://console.cloud.google.com/apis/library/youtube.googleapis.com',
            '3. 搜索框输入: "YouTube Data API v3"（注意大小写）',
            '4. 如果还是找不到，可能是项目还在创建中，等待 1-2 分钟再试'
        ]
    },
    {
        problem: '"启用" 按钮是灰色的或不可点击',
        solutions: [
            '1. 检查是否已登录正确的 Google 账号',
            '2. 确保账号有项目编辑权限',
            '3. 尝试刷新页面（F5）',
            '4. 检查浏览器控制台是否有错误（F12）'
        ]
    },
    {
        problem: '点击启用后没有反应',
        solutions: [
            '1. 等待几秒钟，API 启用需要时间',
            '2. 检查网络连接',
            '3. 尝试使用无痕模式重新登录',
            '4. 清除浏览器缓存后重试'
        ]
    },
    {
        problem: '提示需要付费或启用结算',
        solutions: [
            '1. YouTube Data API v3 有免费配额（每天 10,000 单位）',
            '2. 对于个人使用，通常不需要启用结算',
            '3. 如果强制要求，可以启用结算（有免费试用额度）',
            '4. 或者尝试使用其他 Google 账号'
        ]
    }
];

issues.forEach((issue, index) => {
    console.log(`\n问题 ${index + 1}: ${issue.problem}`);
    console.log('解决方案:');
    issue.solutions.forEach(solution => console.log(`  ${solution}`));
});

console.log('\n' + '='.repeat(60));
console.log('\n💡 快速链接：');
console.log('直接访问 API 页面:');
console.log('https://console.cloud.google.com/apis/library/youtube.googleapis.com\n');

console.log('📝 手动启用步骤（详细版）：');
console.log('1. 访问: https://console.cloud.google.com/');
console.log('2. 确保右上角选择了你刚创建的项目');
console.log('3. 点击左侧菜单 "API 和服务" → "库"');
console.log('4. 在搜索框输入: youtube');
console.log('5. 找到 "YouTube Data API v3"（图标是 YouTube 的播放按钮）');
console.log('6. 点击进入详情页');
console.log('7. 点击蓝色的 "启用" 按钮');
console.log('8. 等待几秒钟，看到 "API 已启用" 的提示\n');

console.log('✅ 如果成功启用，你会看到：');
console.log('   - 页面顶部显示 "API 已启用"');
console.log('   - 左侧菜单 "API 和服务" → "已启用的 API" 中可以找到它\n');

