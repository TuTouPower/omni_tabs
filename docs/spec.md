# OmniTabs — 扩展规格

Chrome/Edge/Firefox 浏览器扩展，将标签页信息以多种格式复制到剪贴板。

## 技术栈

- WXT (MV2/MV3 抽象，Vite 构建)
- TypeScript
- Vitest (单元) + Playwright (E2E)
- Biome (格式化) + ESLint (lint)

## 核心数据模型

```ts
type Format = 'url' | 'title_url_colon' | 'title_url_newline' | 'title' | 'markdown' | 'csv' | 'json' | 'html' | 'html_table';
type Scope = 'current' | 'window' | 'all_windows' | 'left' | 'right' | 'except_current';
interface Settings { defaultFormat: Format; defaultScope: Scope; includePinned: boolean; }
```

默认: markdown + all_windows + 不含 pinned。

## 输出格式 (9 种)

| 格式 | 示例 |
|------|------|
| url | `https://example.com` |
| title | `Page Title` |
| title_url_colon | `Page Title: https://...` |
| title_url_newline | `Page Title\nhttps://...` |
| markdown | `- [Page Title](https://...)` |
| csv | `"title","url"\n"Page Title","https://..."` |
| json | `[{"title":"Page Title","url":"https://..."}]` |
| html | `<ul><li><a href="...">...</a></li></ul>` |
| html_table | `<table>...</table>` |

## 标签页范围 (6 种)

| 范围 | 说明 |
|------|------|
| current | 当前活动标签页 |
| window | 当前窗口全部标签页 |
| all_windows | 所有窗口全部标签页 |
| left | 活动标签页左侧 |
| right | 活动标签页右侧 |
| except_current | 当前窗口除当前页外 |

Pinned 标签页可选包含。

## 交互入口

### 1. 右键菜单

3 级嵌套: OmniTabs → 格式 (9种) → 范围 (6种)。菜单 ID 格式 `omni_tabs_{format}_{scope}`。

### 2. 快捷键

| 命令 | 默认键 | 范围 |
|------|--------|------|
| copy-current | Alt+Shift+C | 当前标签页 |
| copy-window | Alt+Shift+A | 当前窗口 |
| copy-all-windows | Alt+Shift+W | 所有窗口 |

使用 `defaultFormat` 设置的格式。

### 3. 图标点击

- 受限页面 (chrome://, edge://, file:// 等): 打开 popup.html (独立弹窗)
- 普通页面: 注入 content script → 创建 iframe 面板 (圆角浮层)

### 4. Popup 弹窗

设置面板: 格式 chips + 范围下拉 + pinned 开关 + "立即复制"按钮 + 快捷键列表。

## 架构

```
background.ts (Service Worker)
├── 右键菜单注册/处理
├── 快捷键处理
├── 消息处理 (copyWithSettings)
├── 图标点击 → sync_popup_state + send_toggle_panel_message
└── Popup 状态同步 (标签页切换/URL 变化/窗口切换)

content.ts (Content Script)
├── 监听 omni_tabs-toggle-panel 消息
├── 创建/移除 iframe 面板
├── 监听 omni_tabs-resize (动态高度) / omni_tabs-close
└── 点击外部 / Escape 关闭

popup/main.ts
├── 设置渲染与持久化
├── 复制逻辑 (直接 navigator.clipboard.writeText)
├── 主题切换 (system/light/dark)
└── 嵌入模式: ResizeObserver 上报高度, postMessage 通信

lib/
├── types.ts          — Format/Scope 类型、常量、菜单 ID 解析
├── formatters.ts     — 9 种格式化函数
├── tab_scopes.ts     — 标签页查询与筛选
├── clipboard.ts      — 剪贴板写入 (3 级 fallback)
├── storage.ts        — browser.storage.sync 持久化
├── url_rules.ts      — 受限 URL 检测
├── panel_messaging.ts — 面板消息 (DI 模式，可测试)
└── panel_iframe.ts   — 面板常量/纯函数 (可测试)
```

## 剪贴板写入策略

3 级 fallback:

1. `navigator.clipboard.writeText` — popup/options 页面直接可用
2. Offscreen Document — Chrome MV3 service worker 场景，用 `textarea + execCommand('copy')`
3. Content script 注入 — 向 http/https 标签页注入 `navigator.clipboard.writeText`

任一失败聚合错误信息抛出。

## 面板 (iframe 注入)

- 宽度 320px, 圆角 12px, 右上角定位 (offset 12px)
- z-index: 2147483647 (最大)
- iframe `allow="clipboard-write"` 允许剪贴板访问
- ResizeObserver 动态调整高度, postMessage 通信
- 点击面板外 / Escape 关闭

## 受限 URL 规则

以下 URL 前缀走独立 popup 而非 iframe 注入:

`chrome://`, `edge://`, `chrome-extension://`, `about:`, `file://`, `view-source:`, `wxt://`, `moz-extension://`

## 持久化

- `omni_tabs_settings` (sync): { defaultFormat, defaultScope, includePinned }
- `themeMode` (sync): 'system' | 'light' | 'dark'

## i18n

支持 `en` 和 `zh_CN`。覆盖格式名、范围名、UI 标签、快捷键描述。

## Manifest 配置

- `action.onClicked` 机制: WXT hook 移除 `default_popup`, 由 background 动态 `setPopup`
- `content_scripts`: `<all_urls>`, `document_idle`
- `web_accessible_resources`: popup.html + chunks + assets
- `permissions`: tabs, storage, contextMenus, scripting, offscreen (Chrome)

## 测试

- 单元测试 (Vitest): 41 个, 覆盖 formatters/tab_scopes/clipboard/url_rules/panel_messaging/panel_iframe
- E2E 测试 (Playwright): 4 个, 覆盖 iframe 面板创建、剪贴板无权限错误、扩展重载后面板重开、受限页面无注入
