# Git 部署更新指南

## 📋 当前情况

您的项目已经连接到 GitHub 仓库，有两种部署方式：

### 方式一：自动部署（推荐）✨

使用 GitHub Actions 自动构建和部署，每次推送代码到 GitHub 后自动更新网站。

### 方式二：手动部署

手动将构建好的文件推送到 `gh-pages` 分支。

---

## 🚀 方式一：设置自动部署（GitHub Actions）

### 步骤 1：启用 GitHub Pages

1. 登录 GitHub，进入您的仓库
2. 点击 **Settings** → **Pages**
3. 在 **Source** 中选择：**GitHub Actions**
4. 保存设置

### 步骤 2：推送代码（包含 GitHub Actions 配置）

我已经为您创建了自动部署配置文件（`.github/workflows/deploy.yml`）。

现在您需要：

1. **提交所有更改**（包括新创建的部署配置）：
   ```bash
   git add .
   git commit -m "Add SEO optimizations and GitHub Actions deployment"
   git push
   ```

2. **GitHub Actions 会自动运行**：
   - 自动构建项目
   - 自动部署到 GitHub Pages
   - 网站会自动更新

### 步骤 3：验证自动部署

1. 在 GitHub 仓库页面，点击 **Actions** 标签
2. 您应该能看到 "Build and Deploy" 工作流正在运行
3. 等待完成后，访问 `https://www.mecollage.top/` 查看更新

---

## 📤 方式二：手动部署到 GitHub Pages

如果您不想使用自动部署，可以手动部署：

### 方法 A：使用 gh-pages 包（推荐）

1. **安装 gh-pages**：
   ```bash
   npm install --save-dev gh-pages
   ```

2. **在 package.json 中添加部署脚本**：
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. **运行部署**：
   ```bash
   npm run deploy
   ```

### 方法 B：手动推送到 gh-pages 分支

```bash
# 1. 构建项目
npm run build

# 2. 切换到 dist 目录
cd dist

# 3. 初始化 git（如果还没有）
git init

# 4. 添加所有文件
git add .

# 5. 提交
git commit -m "Deploy optimized version"

# 6. 添加远程仓库（替换为您的仓库地址）
git remote add origin https://github.com/您的用户名/您的仓库名.git

# 7. 推送到 gh-pages 分支
git push -f origin HEAD:gh-pages
```

---

## 🔄 更新部署的流程

### 使用自动部署（GitHub Actions）

**非常简单！** 只需要：

1. **修改代码**
2. **提交并推送**：
   ```bash
   git add .
   git commit -m "更新说明"
   git push
   ```
3. **等待自动部署完成**（约 2-3 分钟）
4. **网站自动更新** ✨

### 使用手动部署

1. **修改代码**
2. **构建并部署**：
   ```bash
   npm run build
   npm run deploy  # 如果配置了 deploy 脚本
   ```
   或
   ```bash
   npm run build
   # 然后按照上面的"方法 B"步骤推送
   ```

---

## ⚙️ 配置自定义域名（www.mecollage.top）

### 如果使用 GitHub Pages：

1. 在仓库的 **Settings** → **Pages** 中
2. 在 **Custom domain** 输入：`www.mecollage.top`
3. 保存后，GitHub 会创建 `CNAME` 文件

### DNS 配置：

在您的域名 DNS 设置中添加：

```
类型: CNAME
名称: www
值: 您的GitHub用户名.github.io
TTL: 3600
```

或者：

```
类型: A
名称: @
值: 185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
```

---

## 📝 当前需要提交的文件

由于我们添加了优化，您需要提交以下新文件：

```
mecollage/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← 新增：自动部署配置
├── public/
│   ├── robots.txt              ← 新增：SEO 文件
│   └── .htaccess               ← 新增：Apache 配置
├── index.html                   ← 已修改：添加了 SEO meta 标签
├── vite.config.js              ← 已修改：优化构建配置
├── package.json                 ← 已修改：项目名称
├── GIT_DEPLOYMENT.md           ← 新增：本文件
├── DEPLOYMENT_GUIDE.md         ← 新增：部署指南
└── PERFORMANCE_OPTIMIZATION.md ← 新增：性能优化说明
```

---

## ✅ 推荐的部署流程

### 第一次设置（只需一次）：

1. ✅ 启用 GitHub Pages（Settings → Pages → Source: GitHub Actions）
2. ✅ 配置自定义域名（如果需要）
3. ✅ 提交所有更改到 GitHub

### 日常更新：

1. 修改代码
2. `git add .`
3. `git commit -m "更新说明"`
4. `git push`
5. 等待自动部署完成（约 2-3 分钟）

---

## 🆘 常见问题

### Q: GitHub Actions 部署失败？
**A:** 
- 检查仓库的 Settings → Actions → General
- 确保 "Workflow permissions" 设置为 "Read and write permissions"
- 检查 Actions 标签页中的错误信息

### Q: 网站没有更新？
**A:**
- 等待 2-3 分钟让部署完成
- 清除浏览器缓存后刷新
- 检查 GitHub Actions 是否成功运行

### Q: 如何查看部署状态？
**A:**
- 在 GitHub 仓库页面点击 **Actions** 标签
- 查看最新的工作流运行状态

### Q: robots.txt 和 .htaccess 会部署吗？
**A:**
- `robots.txt` 在 `public/` 目录，会自动复制到 `dist/`，会部署 ✅
- `.htaccess` 在 `public/` 目录，会自动复制到 `dist/`，会部署 ✅
- 但 `.htaccess` 只在 Apache 服务器生效，GitHub Pages 使用 Nginx，所以不会生效
- 对于 GitHub Pages，缓存和压缩由 GitHub 自动处理

---

## 📞 需要帮助？

如果遇到问题：
1. 检查 GitHub Actions 日志（仓库 → Actions 标签）
2. 确认所有文件已提交到 GitHub
3. 确认 GitHub Pages 已正确配置

---

**推荐使用自动部署（GitHub Actions）**，这样每次推送代码后，网站会自动更新，非常方便！✨


