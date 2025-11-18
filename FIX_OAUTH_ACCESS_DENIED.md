# 修复 OAuth 访问被拒绝错误

## 问题
错误 403: access_denied - "MeCollage Uploader"尚未完成 Google 验证流程

## 原因
你的 Google 账号没有在 OAuth 同意屏幕的测试用户列表中。

## 解决方案

### 方法 1: 添加测试用户（推荐，最快）

1. **访问 OAuth 同意屏幕**：
   https://console.cloud.google.com/apis/credentials/consent

2. **找到"测试用户"部分**

3. **点击"添加用户"按钮**

4. **输入你的 Google 账号邮箱**：
   `lic85666@gmail.com`

5. **点击"添加"**

6. **保存更改**

7. **重新尝试授权**：
   - 关闭之前的授权页面
   - 重新运行上传脚本
   - 或重新访问授权链接

### 方法 2: 检查现有测试用户

1. 访问：https://console.cloud.google.com/apis/credentials/consent
2. 查看"测试用户"列表
3. 确认 `lic85666@gmail.com` 在列表中
4. 如果不在，使用方法 1 添加

## 验证

添加测试用户后，重新访问授权链接应该可以正常授权了。

## 下一步

修复后，重新运行：
```bash
npm run upload-youtube -- --video ./demo.webm
```

