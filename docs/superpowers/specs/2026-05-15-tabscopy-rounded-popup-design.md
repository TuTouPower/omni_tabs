# TabsCopy 圆角 Popup —— iframe 注入面板设计

> 生成时间：2026-05-15 | 项目：tabs_copy | 分支：master

## 1. 背景与目标

### 1.1 问题

Chrome 扩展的**原生 popup 窗口形状无法用 CSS 控制**，这是 Chromium 的已知限制（issue 40852436、41492040 至今 open）。`border-radius` 加在 `html`/`body` 上只能裁剪内容，popup 窗口本身始终是矩形。`color-scheme` 只影响窗口背板颜色，不会把窗口切圆。

前一份交接文档（`docs/bug-handoff-2026-05-14-popup-rounded-corners.md`）里尝试的所有纯 CSS 方案，从原理上就不可能生效。

### 1.2 目标

放弃原生 popup，改用 content script 注入一个 `<iframe>` 面板。iframe 是页面里的普通元素，圆角真实生效。面板**完整复制现有 popup 的全部功能**（格式 chips、范围下拉、置顶开关、主题切换、快捷键列表、立即复制）。

### 1.3 非目标

- 不改动 `lib/*` 任何文件（纯逻辑层）。
- 不重写 popup 的 UI 渲染逻辑（iframe 内跑的就是现有 `popup.html` + `main.ts`）。
- 不做复杂的注入失败回退（MVP 仅 log）。

## 2. 方案选型

采用**方案 A：iframe 注入**。

content script 注入一个 `<iframe src="chrome-extension://<id>/popup.html">`，外加一个圆角、定位在右上角的包裹层。iframe 内部运行在扩展页上下文 —— `browser.tabs`、`navigator.clipboard`、`browser.i18n`、`browser.storage` 全部原样可用，因此 `popup.html` + `main.ts` 几乎零改动。

被否决的方案 B（Shadow DOM 移植）需要重写全部渲染、代理每个 `browser.tabs` 调用、手动处理主题隔离，改动量大，违背"完整复制 popup"的省力初衷。

方案 A 唯一新增复杂度是 iframe 高度自适应（iframe 不像原生 popup 自动撑高），用一条 `postMessage` 解决。

## 3. 架构与文件改动

```
entrypoints/
  background.ts        — 改：移除静态 default_popup 依赖，加 action.onClicked + 动态 setPopup
  content.ts           — 新增：注入/管理 iframe 面板（content script）
  popup/
    index.html         — 不变（color-scheme meta 保留，原生 popup 回退仍用）
    main.ts            — 改：渲染后向父窗口 postMessage 上报高度
    style.css          — 改：删除 html/body 的 border-radius + overflow 死代码
wxt.config.ts          — 改：popup.html 加入 web_accessible_resources；注册 content script
lib/*                  — 不变
```

## 4. 详细设计

### 4.1 action 点击行为切换（background.ts）

WXT 因 popup entrypoint 会自动写入静态 `default_popup`，但运行时由 background **动态覆盖**（详见 4.7）。核心逻辑：

- 监听 `tabs.onActivated` 和 `tabs.onUpdated`，判断当前活动标签的 URL：
  - **受限页** → `action.setPopup({ popup: 'popup.html' })`，点图标走原生 popup（方形，但可用）。
  - **普通页** → `action.setPopup({ popup: '' })`，使 `action.onClicked` 能触发。
- 监听 `action.onClicked`：只在普通页触发 → 向该 tab 的 content script 发 `togglePanel` 消息。

受限页判定抽成纯函数：

```typescript
// 返回 true 表示该 URL 不能注入 content script，需回退原生 popup
export function isRestrictedUrl(url: string | undefined): boolean
```

判定规则：URL 为空、或以下前缀之一即为受限：
`chrome://`、`chrome-extension://`、`edge://`、`about:`、`devtools://`、`view-source:`、`https://chrome.google.com/webstore`、`https://chromewebstore.google.com`。

放置位置：`lib/url_rules.ts`（新文件，纯函数，便于单测）。

### 4.2 iframe 面板生命周期（content.ts，新增）

content script 通过 `wxt.config.ts` 注册，匹配 `<all_urls>`，`run_at: document_idle`。

模块级单例变量持有当前包裹层引用：`let panel: HTMLDivElement | null = null`。

收到 background 的 `togglePanel` 消息：

- `panel` 存在 → 调用 `removePanel()`（再次点图标即关闭）。
- `panel` 不存在 → 调用 `createPanel()`。

`createPanel()`：

- 创建包裹 `<div>`：`position: fixed; top: 12px; right: 12px; z-index: 2147483647; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4); width: 320px;`。
- 内嵌 `<iframe>`：`src = browser.runtime.getURL('popup.html')`；`width: 320px; height: 0`（初始，等高度消息）；`border: none; display: block;`。
- 包裹 div 加 `data-tabscopy-panel` 属性，便于点外判定。
- append 到 `document.documentElement`（避免被页面 `body` 样式影响）。
- 注册点外关闭与 Esc 监听（见 4.3）。

`removePanel()`：移除包裹层，注销监听，`panel = null`。

### 4.3 点外关闭与 Esc

- `document.addEventListener('click', handler, true)`（捕获阶段）：`event.target` 不在 `[data-tabscopy-panel]` 内 → `removePanel()`。
  - 注意：创建面板的那次图标点击不在页面内、不会误触发；但为保险，`createPanel` 后用 `requestAnimationFrame` 延迟一帧再挂 click 监听。
- `document.addEventListener('keydown', handler)`：`event.key === 'Escape'` → `removePanel()`。
- 监听在 `removePanel()` 中全部注销。

### 4.4 iframe 高度自适应

iframe 不会自动撑高，需 popup 内部把高度回传：

- **main.ts 侧**：
  - 顶层窗口判定：`const isEmbedded = window.parent !== window`。`isEmbedded === false` 时（原生 popup 回退场景）跳过所有上报。
  - `init()` 结束后 `requestAnimationFrame` 测 `document.body.scrollHeight`，发送：
    `window.parent.postMessage({ type: 'tabscopy-resize', height }, '*')`。
  - 用 `ResizeObserver` 观察 `document.body`，内容变化（chips 重渲染、复制状态出现等）时再次上报。
- **content.ts 侧**：
  - 监听 `window` 的 `message` 事件。
  - 校验：`event.source === iframe.contentWindow` 且 `event.data?.type === 'tabscopy-resize'` 且 `typeof event.data.height === 'number'`。
  - 通过校验 → `iframe.style.height = event.data.height + 'px'`。
  - origin 不做强校验（`event.source` 比对已足够，且扩展页 origin 在 `*` 发送下可靠性更高）；但 type 字段必须严格匹配，防止页面伪造消息。

### 4.5 复制动作

iframe 内运行的是扩展页上下文，`main.ts` 现有的 `handleCopy()`（`browser.tabs.query` + `navigator.clipboard.writeText`）**原样工作，无需改动**。右键菜单/快捷键的 background 复制管线也不受影响。

### 4.6 style.css 清理

删除 `html` 和 `body` 上的 `border-radius: 12px` 与 `overflow: hidden`（纯死代码，对原生 popup 无效，对 iframe 场景圆角由包裹 div 负责）。`html { background: var(--bg-primary) }` 保留（原生 popup 回退时防止露白角）。

### 4.7 wxt.config.ts 改动

- `manifest.action` 移除/不设 `default_popup`（WXT 默认会因 `entrypoints/popup` 自动注入 `default_popup`，需显式覆盖为不设，或在 background 启动时立即 `setPopup('')`）。
  - 实现细节：WXT 检测到 popup entrypoint 会自动写 `default_popup: 'popup.html'`。最稳妥做法是保留它，background 在 `onInstalled` / 启动时立即根据当前标签调用 `setPopup`，由 4.1 的动态逻辑接管。即"静态默认值存在，但运行时立刻被覆盖"。
- `manifest.web_accessible_resources` 增加 `popup.html`（及其引用的 chunk/css 资源；WXT 通常自动处理 entrypoint 资源，需构建后验证 `popup.html` 可被 `<all_urls>` 访问），`matches: ['<all_urls>']`。
- content script entrypoint：新增 `entrypoints/content.ts`，WXT 自动注册；如需指定 `matches`，在文件内 `export default defineContentScript({ matches: ['<all_urls>'], ... })`。

## 5. 错误处理

- content script 注入 iframe 失败（极端 CSP 页面禁止 iframe）：`createPanel()` 包 try/catch，失败仅 `console` 记录（MVP 不做回退）。
- background 向无 content script 的标签发消息会 reject：`browser.tabs.sendMessage(...).catch(...)` 静默吞掉（受限页本就走原生 popup，理论上不会走到这里，但作防御）。
- `message` 事件严格校验 type 字段，防止宿主页面伪造 resize 消息。

## 6. 测试

### 6.1 单元测试（新增）

- `lib/url_rules.ts` 的 `isRestrictedUrl`：
  - `chrome://extensions` → true
  - `chrome-extension://abc/popup.html` → true
  - `https://chrome.google.com/webstore/...` → true
  - `about:blank` → true
  - `undefined` / `''` → true
  - `https://example.com` → false
  - `http://localhost:3000` → false

### 6.2 手动验证清单

- [ ] 普通网页点扩展图标 → 右上角弹出**圆角**面板
- [ ] 再次点图标 → 面板关闭
- [ ] 点面板外区域 → 关闭
- [ ] 按 Esc → 关闭
- [ ] 切换格式 chips / 范围 → 面板高度跟随内容变化
- [ ] 面板内"立即复制" → 复制成功，状态提示正常
- [ ] 主题切换、置顶开关、快捷键列表 → 功能正常
- [ ] `chrome://extensions` 等受限页点图标 → 回退原生（方形）popup，功能正常
- [ ] 右键菜单 / 快捷键复制 → 不受影响

## 7. 影响范围与风险

- **UX 变化**：面板不再锚定在工具栏图标正下方，而是页面右上角。受限页体验为方形 popup（可接受，已与用户确认）。
- **风险**：WXT 对 `web_accessible_resources` 和 popup entrypoint 资源的自动处理需构建后实测验证；iframe 内 popup 资源（JS chunk、CSS）路径必须能在 `<all_urls>` 下加载。
- **i18n**：iframe 内是扩展上下文，`browser.i18n.getMessage` 正常，无需改动。
