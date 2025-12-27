# MeCollage 设计系统

## 1. 颜色方案

### 主色调
```css
--primary-color: #8fd68f;
--primary-dark: #66BB6A;
--primary-light: #A5D6A7;
```

### 辅助色
```css
--secondary-orange: #FFA726;
--secondary-blue: #42A5F5;
--secondary-purple: #AB47BC;
--secondary-green: #66BB6A;
```

### 背景色
```css
--bg-primary: rgba(0, 0, 0, 0.7);
--bg-secondary: rgba(0, 0, 0, 0.5);
--bg-card: rgba(0, 0, 0, 0.35);
--bg-overlay: rgba(0, 0, 0, 0.25);
```

### 文字色
```css
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.9);
--text-muted: rgba(255, 255, 255, 0.7);
--text-dark: #333333;
```

### 阴影和效果
```css
--shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.15);
--shadow-medium: 0 8px 24px rgba(0, 0, 0, 0.25);
--shadow-hard: 0 16px 48px rgba(0, 0, 0, 0.4);
--blur-effect: blur(18px);
```

## 2. 字体样式

### 主要字体
```css
font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### 字体层次
```css
/* 标题 */
--font-title: 2.5rem;
--font-subtitle: 1.2rem;

/* 正文 */
--font-body: 1rem;
--font-small: 0.9rem;
--font-tiny: 0.8rem;
```

### 字体权重
```css
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

## 3. 间距和尺寸

### 间距单位
```css
--spacing-xs: 0.5rem;
--spacing-sm: 1rem;
--spacing-md: 1.5rem;
--spacing-lg: 2rem;
--spacing-xl: 3rem;
--spacing-xxl: 4rem;
```

### 圆角
```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 20px;
--radius-xl: 30px;
--radius-full: 50%;
```

## 4. 组件规范

### 4.1 导航栏
- 背景色：透明
- 文字颜色：--text-primary
- 激活状态：使用--primary-color
- 高度：60px
- 阴影：--shadow-medium

### 4.2 按钮
- 主按钮：背景色--primary-color，文字色--text-dark
- 次要按钮：背景色--bg-secondary，文字色--text-primary，边框1px solid rgba(255,255,255,0.2)
- 圆角：--radius-md
- 内边距：12px 24px
- 悬停效果：transform: translateY(-2px)，阴影--shadow-medium

### 4.3 卡片
- 背景色：--bg-card
- 边框：1px solid rgba(255, 255, 255, 0.18)
- 圆角：--radius-lg
- 阴影：--shadow-medium
- 内边距：--spacing-lg
- 模糊效果：--blur-effect

### 4.4 表单元素
- 输入框：背景色--bg-secondary，边框1px solid rgba(255,255,255,0.2)，圆角--radius-md
- 选择框：同输入框样式
- 滑块：轨道背景色rgba(255,255,255,0.2)，滑块颜色--primary-color

### 4.5 标题和文本
- 标题：颜色--primary-color，文字阴影3px 3px 12px rgba(0, 0, 0, 0.6)
- 副标题：颜色--text-secondary，文字阴影2px 2px 6px rgba(0, 0, 0, 0.5)
- 正文：颜色--text-secondary
- 辅助文字：颜色--text-muted

## 5. 动画和过渡

### 5.1 过渡效果
```css
--transition-fast: 0.2s ease;
--transition-normal: 0.3s ease;
--transition-slow: 0.5s ease;
```

### 5.2 动画效果
- 悬停动画：transform: translateY(-5px)，阴影增强
- 显示/隐藏动画：opacity和transform的过渡
- 背景动画：云朵飘动效果

## 6. 响应式设计

### 断点设置
```css
--breakpoint-sm: 576px;
--breakpoint-md: 768px;
--breakpoint-lg: 992px;
--breakpoint-xl: 1200px;
```

### 响应式策略
- 移动端优先设计
- 灵活的网格系统
- 自适应导航栏
- 图片响应式加载

## 7. 图片优化

### 格式优化
- 优先使用WebP格式，回退到PNG/JPEG
- 根据浏览器支持自动切换

### 加载策略
- 关键图片预加载
- 非关键图片懒加载
- 响应式图片尺寸

## 8. 图标系统

- 使用Font Awesome图标库
- 统一图标大小和颜色
- 图标与文字对齐方式

## 9. 交互设计

### 9.1 悬停状态
- 清晰的视觉反馈
- 平滑的过渡效果
- 一致的交互模式

### 9.2 焦点状态
- 可见的焦点轮廓
- 键盘导航支持
- 无障碍设计考虑

### 9.3 反馈机制
- 成功/错误提示
- 加载状态指示器
- 操作确认对话框

## 10. 代码规范

### 10.1 CSS命名规范
- 使用BEM命名规范
- 组件化CSS结构
- 避免深度嵌套

### 10.2 HTML结构规范
- 语义化标签
- 合理的嵌套结构
- 必要的ARIA属性

### 10.3 JavaScript规范
- 模块化设计
- 清晰的函数命名
- 适当的注释
- 错误处理机制

## 11. 实施指南

1. 所有新页面必须遵循此设计系统
2. 现有页面逐步迁移到该设计系统
3. 定期审查和更新设计系统
4. 确保跨浏览器兼容性
5. 保持性能优化

## 12. 维护和更新

- 设计系统版本控制
- 变更日志记录
- 团队培训和沟通
- 定期设计审查
