# YouTube 上传设置指南

## 前置要求

1. **安装依赖**
   ```bash
   npm install googleapis
   ```

2. **安装 FFmpeg（可选，用于视频格式转换）**
   - Windows: 下载 https://ffmpeg.org/download.html
   - 或使用包管理器: `choco install ffmpeg` (Chocolatey) 或 `scoop install ffmpeg` (Scoop)

## 设置 Google OAuth 凭据

### 步骤 1: 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 项目名称：`mecollage-youtube-uploader`（或任意名称）

### 步骤 2: 启用 YouTube Data API v3

1. 在 Google Cloud Console 中，进入 **API 和服务** > **库**
2. 搜索 "YouTube Data API v3"
3. 点击 **启用**

### 步骤 3: 创建 OAuth 2.0 凭据

1. 进入 **API 和服务** > **凭据**
2. 点击 **创建凭据** > **OAuth 客户端 ID**
3. 如果提示配置 OAuth 同意屏幕：
   - 用户类型：**外部**
   - 应用名称：`MeCollage YouTube Uploader`
   - 用户支持电子邮件：你的邮箱
   - 开发者联系信息：你的邮箱
   - 保存并继续
   - 作用域：添加 `https://www.googleapis.com/auth/youtube.upload`
   - 保存并继续
   - 测试用户：添加你的 Google 账号
   - 保存并继续
4. 应用类型：**桌面应用**
5. 名称：`MeCollage Uploader`
6. 点击 **创建**
7. 下载 JSON 文件
8. 将文件重命名为 `client_secret.json` 并放在项目根目录

### 步骤 4: 运行上传脚本

```bash
# 1. 先生成演示视频
npm run demo-video -- --output ./demo.webm

# 2. 上传到 YouTube（首次运行需要授权）
npm run upload-youtube -- --video ./demo.webm

# 或使用自定义参数
npm run upload-youtube -- \
  --video ./demo.webm \
  --title "MeCollage Demo" \
  --description "演示视频描述" \
  --tags "collage,photo,editor" \
  --privacy unlisted
```

## 参数说明

- `--video <path>`: 视频文件路径（必需）
- `--title <title>`: 视频标题
- `--description <desc>`: 视频描述
- `--tags <tags>`: 标签（逗号分隔）
- `--privacy <level>`: 隐私设置（`public`、`unlisted`、`private`，默认：`unlisted`）
- `--credentials <path>`: OAuth 凭据文件路径（默认：`./client_secret.json`）

## 首次授权流程

1. 运行脚本后，会显示授权 URL
2. 在浏览器中打开 URL
3. 使用你的 Google 账号登录并授权
4. 复制授权码并粘贴到终端
5. 授权令牌会保存到 `youtube_token.json`，下次无需重新授权

## 注意事项

- YouTube 要求视频格式为 MP4。如果使用 WebM，建议先转换为 MP4
- 视频文件大小限制：最大 256GB
- 视频时长限制：最长 12 小时
- 首次上传可能需要较长时间处理
- 确保网络连接稳定

## 故障排除

**错误：OAuth credentials not found**
- 确保 `client_secret.json` 在项目根目录
- 检查文件名是否正确

**错误：FFmpeg conversion failed**
- 安装 FFmpeg：https://ffmpeg.org/download.html
- 或手动转换视频格式

**错误：Upload failed**
- 检查视频格式（推荐 MP4）
- 检查文件大小是否超过限制
- 检查网络连接

