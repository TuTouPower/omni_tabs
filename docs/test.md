# TabsCopy 测试计划

## 目标

在用户运行扩展前，尽量提前发现以下问题：

- 构建产物不可加载
- content script 未注入或消息失败
- 普通网页点击扩展图标无反应
- iframe popup 资源或权限策略错误
- iframe 内复制失败
- 扩展 reload 后旧网页失效
- 受限页面 fallback 异常
- 右键菜单 / 快捷键复制回归

测试分三层：

1. **单元测试**：稳定、快，保护关键分支。
2. **Playwright 真实浏览器冒烟**：覆盖浏览器扩展运行时策略。
3. **人工验收**：检查自动化难稳定覆盖的 UI 和真实交互。

---

## 1. 单元测试

### 1.1 运行命令

```bash
npm test
```

### 1.2 必测范围

#### URL 规则

文件：`tests/url_rules.test.ts`

覆盖：

- `chrome://extensions` → 受限
- `chrome-extension://...` → 受限
- `edge://...` → 受限
- `about:blank` → 受限
- `devtools://...` → 受限
- `view-source:...` → 受限
- Chrome Web Store URL → 受限
- `moz-extension://...` → 受限
- `file://...` → 默认受限
- `https://example.com` → 可注入
- `http://localhost:3000` → 可注入

#### Panel messaging fallback

前置重构：先把 `entrypoints/background.ts` 内的 panel 消息发送逻辑抽到可测模块，例如 `lib/panel_messaging.ts`。

原因：当前 fallback 路径横跨两层逻辑：

- `send_toggle_panel_message` 负责首次发送、注入 content script、重试和抛错
- `handle_action_click` 负责捕获错误并触发 `notify_panel_failure`

建议新增：`tests/panel_messaging.test.ts`

目的：防止扩展 reload 后，旧网页没有 content script 时再次出错。

覆盖：

1. 首次 `tabs.sendMessage` 成功：
   - 不调用 `scripting.executeScript`
   - 不重试

2. 首次 `tabs.sendMessage` 失败：
   - 调用 `scripting.executeScript`
   - 注入文件必须是 `/content-scripts/content.js`
   - 注入后再次调用 `tabs.sendMessage`

3. 注入后重试仍失败：
   - 向上抛错
   - background 可显示 `!` badge

#### Iframe 创建逻辑

建议把 iframe 创建逻辑抽成可测纯函数或小模块，例如 `lib/panel_iframe.ts`。

建议新增：`tests/panel_iframe.test.ts`

覆盖：

- iframe `src` 指向 `/popup.html`
- iframe `allow` 包含 `clipboard-write`
- wrapper 带 `data-tabscopy-panel`
- wrapper 使用固定定位和高 `z-index`
- iframe 高度被 clamp 到视口范围内
- `tabscopy-resize` 只接受来自 iframe 的消息
- `tabscopy-close` 可关闭 panel
- 未知 message type 被忽略

---

## 2. 静态质量检查

### 2.1 命令

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

### 2.2 通过标准

- TypeScript 无错误
- ESLint 无错误、无 warning
- Biome 格式检查通过
- WXT build 成功
- `.output/chrome-mv3/manifest.json` 存在

### 2.3 构建产物检查

构建后检查 manifest：

```bash
node -e "const m=require('./.output/chrome-mv3/manifest.json'); console.log(JSON.stringify({action:m.action, content_scripts:m.content_scripts, web_accessible_resources:m.web_accessible_resources}, null, 2))"
```

必须确认：

- `action` 存在，但不包含静态 `default_popup`
- `content_scripts` 包含 `<all_urls>`
- `content_scripts[*].js` 包含 content script 产物
- `web_accessible_resources` 包含：
  - `popup.html`
  - popup JS chunk
  - popup CSS

---

## 3. Playwright 真实浏览器冒烟测试

## 3.1 定位

Playwright smoke 不是完整功能测试。它的价值是提前发现真实浏览器运行时问题：

- 扩展无法加载
- content script 没注入
- action 点击后无法通信
- iframe 没插入页面
- popup 资源无法作为 web accessible resource 加载
- iframe 权限策略导致 Clipboard API 被禁
- 扩展 reload 后旧网页没有 content script

### 3.2 运行方式

前置依赖：

```bash
npm install -D @playwright/test
```

建议新增根目录配置：`playwright.config.ts`

关键配置：

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    use: {
        channel: 'chrome',
        headless: false,
    },
});
```

说明：如果不新增 `playwright.config.ts`，必须在测试里直接用 `chromium.launchPersistentContext` 显式传入 `channel: 'chrome'` 和 `headless: false`。

建议新增脚本：

```json
{
  "scripts": {
    "test:e2e": "playwright test tests/e2e"
  }
}
```

本地运行：

```bash
npm run build
npm run test:e2e
```

### 3.3 浏览器要求

优先使用宿主机 Chrome headed 模式，并在 Playwright 配置或测试里显式使用 `channel: 'chrome'`。不要使用 Playwright 内置浏览器。

原因：

- 扩展 toolbar/action 行为需要真实浏览器环境
- headless 模式对扩展支持有限
- WSL 环境下 Playwright 内置浏览器可能与用户实际 Chrome 不一致

### 3.4 最小冒烟用例

建议新增：`tests/e2e/rounded_popup_smoke.test.ts`

#### 用例 1：普通网页点击图标弹出圆角 iframe

步骤：

1. 启动带扩展的宿主机 Chrome persistent context：
   - `channel: 'chrome'`
   - `headless: false`
   - `--disable-extensions-except=.output/chrome-mv3`
   - `--load-extension=.output/chrome-mv3`
2. 打开本地普通网页，例如临时 HTML server。
3. 触发扩展 action。
4. 断言页面 DOM 出现：
   - `[data-tabscopy-panel]`
   - `[data-tabscopy-panel] iframe`
5. 断言 iframe：
   - `src` 包含 `popup.html`
   - `allow` 包含 `clipboard-write`

通过标准：

- 不出现 `!` badge
- 页面出现圆角 panel wrapper
- iframe 加载成功

#### 用例 2：iframe 内复制不报权限错误

步骤：

1. 在普通网页打开圆角 iframe。
2. 定位 iframe 内的 Copy Now 按钮。
3. 点击 Copy Now。
4. 监听 console/pageerror。
5. 检查没有以下错误：
   - `NotAllowedError`
   - `Clipboard API has been blocked`
   - `permissions policy`
6. 断言 iframe 内状态显示 copied / tabs copied。

通过标准：

- Copy Now 不抛错
- 状态文本变为成功
- 剪贴板写入路径没有权限策略错误

#### 用例 3：扩展 reload 后旧网页仍能弹出

步骤：

1. 打开普通网页。
2. 重新加载扩展，或模拟旧页面缺少 content script 的状态。
3. 不刷新普通网页。
4. 点击扩展图标。
5. 断言圆角 panel 出现。

通过标准：

- background fallback 调用 `scripting.executeScript`
- 不出现 `!` badge
- panel 出现

说明：

- 如果 Playwright 无法稳定点击 toolbar，可保留该用例为本地 smoke，不进 CI。
- CI 中至少保留 `panel_messaging` 单测，覆盖同一 fallback 逻辑。

#### 用例 4：受限页 fallback 原生 popup

说明：manifest 不应配置静态 `action.default_popup`。受限页 fallback 必须通过运行时逻辑验证。

步骤：

1. 打开 `chrome://extensions`。
2. 点击扩展图标。
3. 确认没有注入 iframe panel。
4. 原生 popup 正常打开。

通过标准：

- 受限页不出现 `[data-tabscopy-panel]`
- 原生 popup 可用

---

## 4. 人工验收清单

每次修改 popup、content script、background action、clipboard、manifest 后，必须人工跑一次。

### 4.1 普通网页

- [ ] 重新加载扩展
- [ ] 打开普通网页
- [ ] 点击扩展图标
- [ ] 右上角出现圆角 panel
- [ ] 再次点击扩展图标，panel 关闭
- [ ] 点击页面空白处，panel 关闭
- [ ] 焦点在宿主页时按 Esc，panel 关闭
- [ ] 焦点在 iframe 内时按 Esc，panel 关闭

### 4.2 iframe 内功能

- [ ] Copy Now 可复制
- [ ] 没有 `NotAllowedError`
- [ ] 没有 Clipboard permissions policy 错误
- [ ] 成功状态显示正常
- [ ] 格式 chips 可切换
- [ ] 范围下拉可切换
- [ ] Include pinned 可切换
- [ ] 主题按钮可切换
- [ ] Configure Shortcuts 可打开快捷键页面

### 4.3 扩展 reload 生命周期

- [ ] 打开普通网页
- [ ] 重新加载扩展
- [ ] 不刷新普通网页
- [ ] 点击扩展图标
- [ ] 圆角 panel 正常出现
- [ ] 不出现 `!` badge

### 4.4 受限页

- [ ] 打开 `chrome://extensions`
- [ ] 点击扩展图标
- [ ] 原生直角 popup 正常出现
- [ ] 页面内没有注入 panel

### 4.5 其他入口

- [ ] 右键菜单复制正常
- [ ] Alt+Shift+C 正常
- [ ] Alt+Shift+A 正常
- [ ] Alt+Shift+W 正常
- [ ] Badge 成功反馈正常

---

## 5. 发布门禁

交给用户前必须满足：

```bash
npm run quality
```

并完成：

- [ ] manifest 构建产物检查通过
- [ ] Playwright smoke 已跑；若没跑，必须明确说明原因
- [ ] 人工验收清单核心项通过：
  - 普通页弹出圆角 panel
  - iframe 内 Copy Now 成功
  - 扩展 reload 后旧网页仍能弹出
  - 受限页 fallback 正常

完成报告必须写清：

- 自动测试结果
- Playwright smoke 是否执行
- 手动验收是否执行
- 未执行项和原因

---

## 6. 已知限制

- Playwright 对扩展 toolbar/action 的自动点击不如页面 DOM 稳定。
- Headed Chrome smoke 更接近用户真实环境，但不适合所有 CI。
- 单元测试不能发现浏览器权限策略问题。
- build/typecheck/lint 不能证明扩展运行时可用。
- 剪贴板行为可能受浏览器版本、页面权限策略和用户手势限制影响。

---

## 7. 推荐优先级

优先实现：

1. 抽出 `lib/panel_messaging.ts`
2. `tests/panel_messaging.test.ts`
3. 抽出 `lib/panel_iframe.ts`
4. `tests/panel_iframe.test.ts`
5. `tests/e2e/rounded_popup_smoke.test.ts`
6. `npm run test:e2e`

先让关键 bug 有自动防线，再逐步增强真实浏览器 smoke。
