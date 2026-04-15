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

**1. 核心目标** — 浏览器扩展 TabsCopy 开发完成，修复右键菜单剪贴板复制失败问题。

**2. 已完成**
- 完整扩展功能: 9种格式 × 6种范围、右键菜单、快捷键、Popup 设置面板、Badge 反馈、中英文 i18n
- 41 个单元测试全部通过，Chrome MV3 构建成功
- Popup "立即复制"按钮**已可用**（直接 `navigator.clipboard.writeText`，有 document 上下文 + 用户手势）
- 剪贴板方案经历 4 轮迭代:
  - v1: `navigator.clipboard.writeText` 在 service worker 中失败
  - v2: `scripting.executeScript` + `document.execCommand('copy')` 返回 false
  - v3: Offscreen Document API（缺少 `offscreen` 权限，未生效）
  - v4: 当前版本（`lib/clipboard.ts`）— 三级 fallback: 直接 clipboard API → 注入 `navigator.clipboard.writeText` 到 http 页面 → Offscreen Document

**3. 卡点**
- **右键菜单复制仍然失败**，Popup 按钮复制正常
- 最后一次修改将注入方式从 `document.execCommand('copy')` 改为 `navigator.clipboard.writeText()`（注入到 http/https 标签页），**用户尚未测试此版本**
- 需确认 `navigator.clipboard.writeText()` 在 content script 中是否受 `clipboardWrite` 权限支持
- 如果仍失败，备选方案:
  - 检查 offscreen document 是否正确创建（添加调试日志）
  - 尝试 `world: 'MAIN'` 注入
  - 参考 Chrome 官方 offscreen document 示例排查消息传递

**4. 下一步**
1. 让用户重新加载扩展，测试右键复制（当前 v4 注入 `navigator.clipboard.writeText` 方案）
2. 若仍失败，在 `lib/clipboard.ts` 各 fallback 分支添加具体错误信息定位失败点（如 `"Method 2 failed: <error>"` 而非统一 `"Clipboard write failed"`）
3. 根据定位结果针对性修复，优先确保 offscreen document 方案走通

**5. 上下文索引**
- 必读代码:
  - `lib/clipboard.ts` — 剪贴板写入核心（当前卡点所在）
  - `entrypoints/background.ts` — 右键菜单/快捷键调用 `copyTabs()` → `writeToClipboard()`
  - `entrypoints/popup/main.ts` — Popup 复制按钮（直接 clipboard API，已可用）
  - `public/offscreen.js` + `public/offscreen.html` — Offscreen document fallback
  - `wxt.config.ts` — 权限配置（含 `offscreen` + `clipboardWrite` + `scripting`）
- 必读文档:
  - 见本文件"项目结构"和"功能"章节
  - 设计文档: `docs/superpowers/specs/2026-04-15-tabscopy-design.md`
  - 实现计划: `docs/superpowers/plans/2026-04-15-tabscopy.md`
