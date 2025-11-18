# YouTube Data API 启用 - 快速修复指南

## 方法 1: 直接访问 API 页面（最快）

**直接点击这个链接**：
https://console.cloud.google.com/apis/library/youtube.googleapis.com

1. 如果提示选择项目，选择你刚创建的项目
2. 点击蓝色的 **"启用"** 按钮
3. 等待几秒钟，看到 "API 已启用" 提示

## 方法 2: 通过搜索

1. 访问：https://console.cloud.google.com/
2. 确保右上角选择了正确的项目
3. 在顶部搜索框输入：`youtube data api v3`
4. 点击搜索结果中的 "YouTube Data API v3"
5. 点击 "启用" 按钮

## 方法 3: 通过菜单导航

1. 访问：https://console.cloud.google.com/
2. 左侧菜单 → **"API 和服务"** → **"库"**
3. 在搜索框输入：`youtube`
4. 找到 **"YouTube Data API v3"**（有 YouTube 播放按钮图标）
5. 点击进入
6. 点击 **"启用"** 按钮

## 常见问题

### ❌ 找不到 API
- **解决**：确保选择了正确的项目（右上角项目选择器）
- **解决**：等待 1-2 分钟，项目可能还在初始化

### ❌ 启用按钮不可点击
- **解决**：刷新页面（F5）
- **解决**：检查是否已登录正确的 Google 账号

### ❌ 提示需要结算账户
- **说明**：YouTube Data API 有免费配额（每天 10,000 单位）
- **解决**：对于个人使用通常不需要，如果强制要求可以启用结算（有免费试用）

## 验证是否成功

启用成功后：
- 页面会显示 "API 已启用"
- 可以在 "API 和服务" → "已启用的 API" 中看到 "YouTube Data API v3"

## 下一步

启用 API 后，继续运行：
```bash
npm run setup-youtube
```

然后继续步骤 3（配置 OAuth 同意屏幕）。

