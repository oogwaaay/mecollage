# MeCollage 部署指南

## 📋 部署前检查清单

✅ 已完成：
- [x] 项目已构建（`dist` 目录已生成）
- [x] `robots.txt` 已包含在构建输出中
- [x] `.htaccess` 文件已准备（如果使用 Apache 服务器）
- [x] SEO meta 标签已添加
- [x] 性能优化配置已完成

## 🚀 部署步骤

### 方法一：使用 FTP/SFTP 上传（适用于传统虚拟主机）

#### 步骤 1：准备文件
所有需要上传的文件都在 `mecollage/dist` 目录中：
```
dist/
├── index.html              ← 主页面
├── robots.txt              ← SEO 文件（重要！）
├── .htaccess               ← Apache 配置（如果使用 Apache）
├── site.webmanifest        ← PWA 配置
├── favicon.png             ← 网站图标
├── favicon-192.png
├── apple-touch-icon.png
├── upload-icon.png
├── placeholder-icon.png
├── remove-icon.png
├── wallImage.png
└── assets/                 ← 所有 CSS 和 JS 文件
    ├── index-Bf9P5mmn.css
    └── js/
        ├── index-DqenBhbz.js
        └── vendor-l0sNRNKZ.js
```

#### 步骤 2：上传文件
1. 使用 FTP 客户端（如 FileZilla、WinSCP）连接到您的服务器
2. 导航到网站根目录（通常是 `public_html`、`www` 或 `htdocs`）
3. **上传整个 `dist` 目录的内容**到网站根目录
   - 注意：是上传 `dist` 目录**里面的内容**，不是 `dist` 目录本身
   - 确保 `index.html` 在网站根目录
   - 确保 `robots.txt` 在网站根目录（`https://www.mecollage.top/robots.txt` 应该能访问）

#### 步骤 3：设置文件权限（Linux/Unix 服务器）
如果使用 Linux 服务器，可能需要设置文件权限：
```bash
chmod 644 index.html
chmod 644 robots.txt
chmod 644 .htaccess
chmod 755 assets/
```

#### 步骤 4：验证部署
访问以下 URL 确认文件正确部署：
- ✅ `https://www.mecollage.top/` - 主页应该正常显示
- ✅ `https://www.mecollage.top/robots.txt` - 应该显示 robots.txt 内容
- ✅ `https://www.mecollage.top/assets/index-Bf9P5mmn.css` - CSS 文件应该能访问

---

### 方法二：使用 Git 部署（适用于 GitHub Pages、Vercel、Netlify 等）

#### GitHub Pages
1. 将 `dist` 目录的内容推送到 `gh-pages` 分支
2. 在 GitHub 仓库设置中启用 GitHub Pages
3. 选择 `gh-pages` 分支作为源

#### Vercel
1. 安装 Vercel CLI：`npm i -g vercel`
2. 在项目根目录运行：`vercel`
3. 按照提示完成部署

#### Netlify
1. 安装 Netlify CLI：`npm i -g netlify-cli`
2. 在项目根目录运行：`netlify deploy --prod --dir=dist`
3. 按照提示完成部署

---

### 方法三：使用命令行部署（SSH）

如果您有服务器 SSH 访问权限：

```bash
# 1. 在本地打包 dist 目录
cd mecollage
tar -czf dist.tar.gz dist/*

# 2. 上传到服务器（替换为您的服务器信息）
scp dist.tar.gz user@your-server.com:/path/to/website/

# 3. SSH 连接到服务器
ssh user@your-server.com

# 4. 解压文件
cd /path/to/website/
tar -xzf dist.tar.gz
rm dist.tar.gz
```

---

## ⚙️ 服务器配置

### Apache 服务器（使用 .htaccess）

如果您的服务器是 Apache，`.htaccess` 文件会自动生效。确保：
1. `.htaccess` 文件已上传到网站根目录
2. Apache 已启用 `mod_rewrite` 和 `mod_expires` 模块

### Nginx 服务器

如果使用 Nginx，需要在服务器配置文件中添加以下内容：

```nginx
server {
    listen 80;
    server_name www.mecollage.top mecollage.top;
    
    root /path/to/your/website;
    index index.html;

    # 缓存配置
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|eot|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/css application/javascript image/svg+xml text/html;
    gzip_min_length 1000;

    # 安全头
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Cloudflare

如果使用 Cloudflare：
1. 在 Cloudflare 控制台启用 "Auto Minify"（CSS、HTML、JavaScript）
2. 启用 "Brotli" 压缩
3. 缓存规则会自动处理（Cloudflare 会自动缓存静态资源）

---

## ✅ 部署后验证

### 1. 功能测试
- [ ] 网站首页正常加载
- [ ] 图片上传功能正常
- [ ] 模板选择功能正常
- [ ] 滤镜功能正常
- [ ] 导出功能正常
- [ ] 多语言切换正常

### 2. SEO 验证
访问以下 URL 确认：
- [ ] `https://www.mecollage.top/robots.txt` - 应该显示正确的 robots.txt 内容
- [ ] 查看网页源代码，确认 `<meta name="description">` 标签存在
- [ ] 使用浏览器开发者工具检查 `<head>` 部分，确认所有 meta 标签正确

### 3. 性能验证
- [ ] 重新运行 [PageSpeed Insights](https://pagespeed.web.dev/)
- [ ] 检查 SEO 分数是否提升（之前是 83）
- [ ] 检查性能指标是否改善
- [ ] 确认 "文档缺少 meta 描述" 警告已消失
- [ ] 确认 "robots.txt 无效" 错误已修复

### 4. 缓存验证
使用浏览器开发者工具：
1. 打开 Network 标签
2. 刷新页面
3. 检查静态资源（CSS、JS、图片）的响应头
4. 确认 `Cache-Control` 头存在（如果配置了服务器）

---

## 🔄 更新部署流程

当您需要更新网站时：

1. **修改代码**
2. **重新构建**：
   ```bash
   cd mecollage
   npm run build
   ```
3. **上传新的 `dist` 目录内容**到服务器
4. **清除 CDN 缓存**（如果使用 CDN，如 Cloudflare）

---

## 🆘 常见问题

### Q: robots.txt 无法访问
**A:** 确保 `robots.txt` 文件在网站根目录，且文件名完全是小写 `robots.txt`（不是 `Robots.txt`）

### Q: .htaccess 不生效
**A:** 
- 确认服务器是 Apache（不是 Nginx）
- 确认 Apache 已启用 `.htaccess` 支持
- 检查文件权限（应该是 644）

### Q: 网站显示空白
**A:**
- 检查浏览器控制台是否有错误
- 确认所有文件路径正确（特别是 `assets` 目录）
- 确认服务器支持 SPA（单页应用）路由

### Q: CSS/JS 文件 404 错误
**A:**
- 确认 `assets` 目录已上传
- 检查文件路径是否正确
- 确认服务器配置允许访问这些文件类型

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. 服务器错误日志
2. 浏览器控制台错误信息
3. 网络请求是否成功（开发者工具 Network 标签）

---

**最后更新：** 2025-01-XX
**项目版本：** 1.0.0


