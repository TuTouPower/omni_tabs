# TabsCopy — 浏览器扩展

Chrome/Edge/Firefox 浏览器扩展，将标签页信息以多种格式复制到剪贴板。

## 技术栈

- **框架**: WXT (抽象 MV2/MV3 差异，Vite 构建)
- **语言**: TypeScript
- **构建**: `npx wxt build` → `.output/chrome-mv3/`
- **开发**: `npx wxt dev`
- **测试**: `npx vitest run`

## 项目结构

```
entrypoints/
  background.ts       — Service worker: 右键菜单、快捷键、消息处理
  popup/
    index.html         — Popup HTML
    main.ts            — Popup 逻辑 (设置、复制按钮)
    style.css          — 暗色主题样式
lib/
  types.ts             — Format/Scope 类型、常量、菜单 ID 解析
  formatters.ts        — 9 种格式化输出 (URL/Title/Markdown/CSV/JSON/HTML 等)
  tab_scopes.ts        — 标签页范围查询与筛选
  clipboard.ts         — 剪贴板写入 (多级 fallback)
  storage.ts           — browser.storage.sync 设置持久化
public/
  offscreen.html/js    — Offscreen document (剪贴板 fallback)
  _locales/en/         — 英文 i18n
  _locales/zh_CN/      — 中文 i18n
tests/                 — vitest 单元测试 (41 个)
wxt.config.ts          — WXT 配置 (权限、命令、manifest)
```

## 功能

- 3 级右键菜单: TabsCopy → 格式 (9种) → 范围 (6种)
- 快捷键: Alt+Shift+C/A/W (可配置)
- Popup: 默认格式/范围设置 + "立即复制"按钮 + 快捷键配置入口
- Badge 反馈: 复制成功后显示标签页数量 (3秒)
- 中英文 i18n

---

## 🔄 交接状态 (Session Handover) — 2026-04-15

**1. 核心目标** — 修复右键菜单剪贴板复制失败（Popup 按钮一直可用）。

**2. 已完成**（commit `03a40eb`）
- `public/offscreen.js` 改用 `textarea + document.execCommand('copy')`，不再用 `navigator.clipboard.writeText`（后者在无焦点的 offscreen document 中会失败）
- `public/offscreen.html` 添加 `<textarea id="clipboard-textarea">` 承载复制内容
- `lib/clipboard.ts` 重写：Service Worker 分支优先走 Offscreen Document，注入 `navigator.clipboard.writeText` 作为兜底；消息加 `target: 'offscreen'` 标识；失败时聚合各分支错误信息抛出
- 构建通过（`npx wxt build`）

**3. 卡点** — 用户尚未测试新版本，等待验证右键菜单复制是否成功。

**4. 下一步**
1. 让用户重新加载扩展，测试网页右键 → TabsCopy → 任一格式/范围，验证复制结果
2. 若失败，查看 service worker console 的具体错误（现在会显示 `createDocument/sendMessage/injection` 各步错误）针对性定位
3. 成功后可考虑精简 clipboard.ts 的 injection 兜底路径（如确认 offscreen 稳定）

**5. 上下文索引**
- 必读代码：`lib/clipboard.ts`、`public/offscreen.js`、`public/offscreen.html`、`entrypoints/background.ts`、`wxt.config.ts`
- 必读文档：见本文件"项目结构"、"功能"章节；设计 `docs/superpowers/specs/2026-04-15-tabscopy-design.md`
