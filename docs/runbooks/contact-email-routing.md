# Contact 邮箱接入操作清单（Cloudflare Email Routing，免费）

> 目标：为 `contact@mecollage.top` 开通**免费收信**，收到用户从 Contact 页发来的邮件。
> 适用：域名 `mecollage.top` 已托管在 Cloudflare（当前即如此：Cloudflare → Vercel 静态站）。
> 费用：**¥0 / $0**。Cloudflare Email Routing 免费，只做**收信转发**（不支持用 contact@ 主动发信）。
> 账户级操作（H8）由维护者本人完成；预计 5–8 分钟 + DNS 生效等待。
> 官方文档：<https://developers.cloudflare.com/email-routing/> · 入门：<https://developers.cloudflare.com/email-routing/get-started/>

---

## 0. 开始前（2 分钟）

- [ ] 能登录 Cloudflare Dashboard，且 `mecollage.top` 的 Nameservers 显示为 Cloudflare（未托管则先接管 DNS）。
- [ ] 准备一个**现有收件邮箱**（Gmail / Outlook / QQ 邮箱均可）作为 destination；**不要**把个人邮箱直接公开在网站上。
- [ ] 确认这个域名**当前没有**正在使用的企业邮箱（Google Workspace / Microsoft 365 / 自建 MX）。
  - 若有：**先停下来**。启用 Email Routing 会接管 MX 记录，可能让现有邮箱收不到信；需要先规划（改用 Cloudflare 转发 vs 保留原邮箱）。
  - 没有：直接继续。
- [ ] 记录当前 DNS 里的 MX / SPF（TXT）记录（截图或复制），用于回滚对照：
  - Dashboard → `mecollage.top` → **DNS → Records** → 筛选 `MX`、`TXT`。

> 对 Vercel 静态站无影响：Email Routing 只动 MX/TXT，不动 A/CNAME，也不影响网站、广告、GA4。

---

## 1. 启用 Email Routing（1 分钟）

- [ ] Dashboard → 选中 **mecollage.top** → 左侧 **Email** → **Email Routing**。
- [ ] 点击 **Enable Email Routing**（如提示 "Add MX records" / "Add required DNS records"，点确认）。
- [ ] Cloudflare 会自动添加它需要的 **MX** 和 **SPF TXT** 记录；不要手动改这些记录。
- [ ] 如果出现 **"MX records conflict"** 警告：说明域名已有其他邮箱服务，**先不要覆盖**，按第 0 步记录后停下来判断。

---

## 2. 添加收件目的地并验证（2 分钟 + 点邮件）

- [ ] **Destination addresses** → **Add destination address**。
- [ ] 输入你的现有邮箱（例如 `you@gmail.com`）→ **Send verification email**。
- [ ] 去该邮箱收 Cloudflare 验证邮件 → 点 **Verify email address**（找不到就翻垃圾箱；可 Resend）。
- [ ] 回到 Email Routing，确认 destination 状态为 **Verified**（未验证的地址不能作为转发目标）。

---

## 3. 创建 contact@ 转发的路由（1 分钟）

- [ ] **Routes** → **Custom addresses** → **Create address**（或 "Add route"）。
- [ ] Custom address 填：`contact@mecollage.top`
- [ ] Action 选：**Send to an email** → 选第 2 步验证过的 destination。
- [ ] 保存。状态应为 **Enabled / Active**。
- [ ] （可选）再建 `support@mecollage.top`、`hello@mecollage.top`，都指向同一邮箱；**不建议**开 Catch-all（会被垃圾邮件扫）。
- [ ] 暂时不需要 "Email Workers" / "Subaddressing"。

---

## 4. 测试收信（1 分钟）

- [ ] 用另一个邮箱（不是 destination 本身）发一封测试信到 `contact@mecollage.top`，主题写 `MeCollage contact test`。
- [ ] 确认 destination 邮箱收到；检查是否进了垃圾箱。
- [ ] （可选）在 Gmail 建过滤规则：`to:(contact@mecollage.top)` → 标签 "MeCollage Contact"，避免漏看。
- [ ] 记录测试时间与结果（截图），后面填进证据。

> 注意：**Email Routing 只负责收信/转发**。你回复用户时，发件人会是你的个人邮箱（除非在邮箱里配置 "Send mail as / 别名发信"，那属于邮箱服务商侧设置，可选）。网站上不会暴露你的个人邮箱，只暴露 `contact@mecollage.top` 这个别名。

---

## 5. 安全 / 反垃圾（按需）

- [ ] 不要把 `contact@` 换成个人邮箱公开；如被大量垃圾邮件命中，删除该 route 或换别名即可（Cloudflare 的 destination 不变）。
- [ ] Cloudflare 自带基础垃圾过滤；不建议额外付费服务。
- [ ] 入站不要求 DMARC；若域名以后要主动发信，再按邮箱服务商要求配置 SPF/DKIM/DMARC。
- [ ] 如未来想做"页面内直接提交"（不打开邮件客户端）：
  - 免费方案：Formspree Free（50 提交/月）或 Web3Forms Free（250 提交/月），需账号 + 隐私政策注明第三方处理方；
  - 零第三方：继续用 `mailto:` 方案（推荐先这样，隐私叙事一致）。

---

## 6. 回滚（需要时）

- [ ] 只停用某一个地址：Email Routing → Routes → 删除 `contact@` route（不影响其他）。
- [ ] 完全停用：Email Routing → Settings → **Disable Email Routing**；Cloudflare 会移除它添加的 MX/TXT。
  - 如果域名原本有企业邮箱：**不要直接 Disable**，先对照第 0 步记录的 MX 恢复，否则会中断现有邮箱。
- [ ] 回滚后网站不受影响（本来就没改站点代码）。

---

## 7. 完成后发给我（用于实现 Contact 表单）

把下面几项发我（截图/文字均可）：

1. `contact@mecollage.top` 已 **Enabled**（Email Routing 概览截图）。
2. Destination 邮箱已 **Verified**。
3. 测试信已收到（时间 + 截图/简述）。
4. 是否还要 `support@` / 其他别名（默认只做 `contact@`）。

我收到后会在 5 语言 Contact 页实现方案 A（`mailto:contact@mecollage.top`）：

- 表单字段：姓名 / 邮箱 / 主题 / 消息 → 提交时打开本机邮件客户端，预填 subject + body；
- 同步提供「复制邮箱」+ GitHub Issues 兜底（桌面无邮件客户端也不走死路）；
- 明确隐私说明：表单不存储、不经过第三方服务器；
- 走 Preview → 你批准 → 生产部署。

---

## 8. 常见问题

| 现象 | 处理 |
|---|---|
| Destination 验证邮件收不到 | 翻垃圾箱；确认地址拼写；Resend；企业邮箱可能拦 Cloudflare 邮件 |
| 建 route 时提示 destination 未验证 | 先完成第 2 步验证 |
| 测试信被退回 / 无 MX | DNS 里确认 Cloudflare 的 MX 记录已生效（通常几分钟，最多 24h）；不要在 Cloudflare 外手动改 MX |
| 出现 MX conflict 警告 | 域名已有邮箱服务，**停止**，先确认是否要替换现有 MX（可能影响现有邮箱） |
| 收到信但回信显示个人地址 | 正常；如需用 contact@ 发信，去邮箱服务商配置 Send-as 别名 |
| 想换收件邮箱 | Email Routing → Destination addresses 新增并验证，再改 route 指向，最后删旧 destination |
| 担心垃圾邮件 | 不用 Catch-all；只建明确别名；必要时换别名并删除旧 route |

---

## 9. 检查清单（复制到你的待办）

- [ ] 域名在 Cloudflare 且无现有企业邮箱（有则先规划）
- [ ] 记录现有 MX/SPF
- [ ] Enable Email Routing
- [ ] 添加 destination 并完成邮箱验证
- [ ] 创建 `contact@mecollage.top` → destination 的 route
- [ ] 外部邮箱发测试信并收到
- [ ] （可选）Gmail 过滤规则
- [ ] 把 4 项完成证据发我
- [ ] 我实现 Contact 表单 → Preview → 批准 → 生产
