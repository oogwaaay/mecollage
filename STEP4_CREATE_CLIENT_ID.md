# 步骤 4: 创建 OAuth 客户端 ID（最后一步！）

## 快速链接

**直接访问凭据页面**：
https://console.cloud.google.com/apis/credentials

## 详细步骤

### 方法 1: 从当前页面创建

1. 在页面上找到蓝色的 **"创建 OAuth 客户"** 按钮
2. 点击它

### 方法 2: 通过菜单导航

1. 访问：https://console.cloud.google.com/apis/credentials
2. 或：左侧菜单 → **"API 和服务"** → **"凭据"**
3. 点击页面顶部的 **"+ 创建凭据"** 按钮
4. 选择 **"OAuth 客户端 ID"**

### 填写信息

1. **应用类型**: 选择 **"桌面应用"** (Desktop app)
   - 如果看不到这个选项，确保你已完成步骤 3（OAuth 同意屏幕）

2. **名称**: 输入 `MeCollage Uploader`
   - 或任意你喜欢的名称

3. 点击 **"创建"** 按钮

### 下载凭据文件

创建成功后，会弹出一个对话框显示：
- 客户端 ID
- 客户端密钥

**重要操作**：
1. 点击对话框中的 **"下载 JSON"** 按钮
2. 文件会下载到你的下载文件夹
3. 将下载的文件**重命名**为：`client_secret.json`
4. 将文件**移动**到项目根目录（`mecollage` 文件夹）

### 验证文件位置

确保文件在正确的位置：
```
mecollage/
  ├── client_secret.json  ← 应该在这里
  ├── package.json
  ├── index.html
  └── ...
```

## 完成！

完成这一步后，所有设置就完成了！接下来就可以：
1. 运行上传脚本
2. 自动上传视频到 YouTube

## 下一步

完成后运行：
```bash
npm run upload-youtube -- --video <视频路径>
```

或者先生成新的演示视频：
```bash
npm run demo-video -- --output ./demo.webm
npm run upload-youtube -- --video ./demo.webm
```

