# OmniTabs — 浏览器扩展

Chrome/Edge/Firefox 浏览器扩展，将标签页信息以多种格式复制到剪贴板。

## 技术栈

- **框架**: WXT (抽象 MV2/MV3 差异，Vite 构建)
- **语言**: TypeScript
- **构建**: `npx wxt build` → `.output/chrome-mv3/`
- **开发**: `npx wxt dev`
- **测试**: `npx vitest run`

### 打包命令

```bash
npx wxt zip -b chrome    # Chrome  → .output/omnitabs-x.x.x-chrome.zip
npx wxt zip -b edge      # Edge    → .output/omnitabs-x.x.x-edge.zip (同 chrome-mv3)
npx wxt zip -b firefox   # Firefox → .output/omnitabs-x.x.x-firefox.zip
```

Edge 和 Chrome 共用 MV3，上传同一份 chrome-mv3 即可。

### 发布 Release

发布 GitHub Release 时必须同时上传 Chrome 和 Firefox 两个 zip，Edge 用户使用 Chrome 包，在 release notes 中注明。

```bash
npx wxt zip -b chrome -b firefox
gh release create v{x.x.x} \
  .output/omnitabs-{version}-chrome.zip \
  .output/omnitabs-{version}-firefox.zip \
  --title "v{x.x.x}" \
  --notes "Edge uses the Chrome zip."
```

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

- 3 级右键菜单: OmniTabs → 格式 (9种) → 范围 (6种)
- 快捷键: Alt+Shift+C/A/W (可配置)
- Popup: 默认格式/范围设置 + "立即复制"按钮 + 快捷键配置入口
- Badge 反馈: 复制成功后显示标签页数量 (3秒)
- 中英文 i18n

