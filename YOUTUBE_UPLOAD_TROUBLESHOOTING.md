# YouTube 上传问题排查

## 当前问题：网络超时 (ETIMEDOUT)

### 可能原因：
1. **授权码过期** - OAuth 授权码通常只有几分钟有效期
2. **网络连接问题** - 无法连接到 Google OAuth 服务器
3. **防火墙/代理阻止** - 网络设置阻止了 HTTPS 连接

### 解决方案：

#### 方案 1: 重新获取授权码（推荐）

1. **重新运行上传脚本**：
   ```bash
   npm run upload-youtube -- --video ./demo.webm
   ```

2. **立即访问新的授权链接**（不要等待）

3. **授权后立即复制授权码**

4. **在终端中快速粘贴授权码**（授权码有效期很短）

#### 方案 2: 检查网络连接

1. **测试网络连接**：
   ```bash
   ping oauth2.googleapis.com
   ```

2. **检查防火墙设置**
   - 确保允许 Node.js 访问网络
   - 检查 Windows 防火墙设置

3. **检查代理设置**
   - 如果使用代理，确保 Node.js 可以访问

#### 方案 3: 使用手动上传（最快）

如果自动上传一直有问题，可以：

1. **从 Cloudinary 下载 MP4**：
   ```
   https://res.cloudinary.com/dztbpf6ke/video/upload/f_mp4/videos/yhrmbrbssenkzktbvbpr.webm
   ```

2. **手动上传到 YouTube**：
   - 访问 https://www.youtube.com/upload
   - 拖拽视频文件
   - 填写信息并发布

### 提示：

- **授权码有效期**：通常只有 5-10 分钟
- **快速操作**：获取授权码后立即使用
- **网络要求**：需要稳定的 HTTPS 连接

### 如果还是不行：

考虑使用手动上传方式，这样更快更可靠。

