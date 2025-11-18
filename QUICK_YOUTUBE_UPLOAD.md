# 快速上传到 YouTube（手动方式）

## 方法 1: 直接下载 MP4（推荐，最快）

1. **获取视频链接**（已生成）：
   ```
   https://res.cloudinary.com/dztbpf6ke/video/upload/f_mp4/videos/p4cmp3wmxjmjwq8afidf.webm
   ```

2. **下载视频**：
   - 在浏览器中打开上面的链接
   - 视频会自动下载为 MP4 格式

3. **上传到 YouTube**：
   - 访问 https://www.youtube.com/upload
   - 拖拽下载的视频文件
   - 填写标题、描述等信息
   - 发布

## 方法 2: 自动上传（需要 OAuth 设置）

如果你想要自动化上传，需要：

1. **5 分钟设置 OAuth**：
   - 访问 https://console.cloud.google.com/
   - 创建项目 → 启用 YouTube Data API v3
   - 创建 OAuth 2.0 凭据（桌面应用）
   - 下载为 `client_secret.json` 放在项目根目录

2. **运行上传脚本**：
   ```bash
   npm run upload-youtube -- --video ./demo.webm
   ```

## 当前视频信息

- **时长**: 28.2 秒
- **尺寸**: 1920×1080
- **格式**: WebM（可转换为 MP4）
- **内容**: MeCollage 工具演示

## 建议的视频信息

**标题**: `MeCollage - Free Online Image Collage Maker`

**描述**:
```
MeCollage is a free online image collage maker. Upload multiple images, choose from templates or create custom grids, adjust spacing and borders, add text and stickers, then export as PNG or JPG. No registration, no watermarks, completely free.

Features:
- Support for 20+ images
- Multiple layout templates (horizontal, vertical, grid)
- Custom grid layouts (up to 30×30)
- Drag and drop upload
- Real-time preview
- Filters and decorations
- High quality export

Try it now: https://www.mecollage.top
```

**标签**: `collage maker, photo collage, image collage, online collage maker, free collage maker, photo grid, image editor`

**隐私设置**: `不公开列出` (unlisted) - 这样只有有链接的人才能看到

