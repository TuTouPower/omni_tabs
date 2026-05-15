# TabsCopy Rounded Popup Runtime Test Design

> 生成时间：2026-05-15 | 项目：tabs_copy | 范围：圆角 popup 运行时回归测试

## 1. 目标

补上自动测试盲区：扩展重新加载后，已经打开的普通网页没有 content script，点击扩展图标必须仍能弹出圆角 iframe 面板。

这次只做两类测试：

1. Playwright 真实浏览器扩展测试，覆盖用户实际遇到的生命周期问题。
2. Vitest fallback 单测，覆盖 `sendMessage` 失败后动态注入 content script 再重试的逻辑。

## 2. 非目标

- 不做完整 E2E 覆盖所有 popup 功能。
- 不测试 Chrome Web Store、`chrome://` 等所有受限页矩阵。
- 不引入远程浏览器服务。
- 不把手动测试完全替代；真实扩展加载仍需本地 Chrome/Chromium 能运行。

## 3. 方案 A：Playwright 真实扩展测试

### 3.1 工具

新增 `@playwright/test` 开发依赖。

测试使用 Chromium persistent context：

- `--disable-extensions-except=.output/chrome-mv3`
- `--load-extension=.output/chrome-mv3`
- 固定临时 user data dir

### 3.2 测试文件

新增：`tests/e2e/rounded_popup_extension.test.ts`

职责：

1. 运行前确保扩展已 build。
2. 启动带扩展的 Chromium。
3. 打开普通网页（本地静态 HTML，避免网络依赖）。
4. 找到扩展 service worker，拿到 extension id。
5. 模拟“已打开页面后扩展重载”：通过 CDP 或扩展管理 API 不稳定，最小可测场景改为：打开页面后手动移除页面内 content script 状态不可行，因此用真实 toolbar click 前先验证 fallback 逻辑已覆盖。若 Playwright 无法点击浏览器 toolbar，则退化为通过 service worker 调用 `chrome.action.onClicked` 不可行。

因此真实 E2E 的稳定路径是：打开普通页后，直接向页面执行 `chrome.runtime` 不可行；应通过 Chrome 扩展的 keyboard/action UI 触发难度较高。

### 3.3 稳定实现方式

推荐使用 Chrome DevTools Protocol 的 `Target` + extension service worker：

- 获取 extension id。
- 打开普通页面。
- 在 service worker context 中执行：
  - 查询当前 active tab。
  - 调用已暴露的内部测试入口不可行，因为 background 函数未导出。

为避免污染生产代码，不暴露测试入口。

结论：**Playwright 真实点击 toolbar 在常规 Playwright API 中不可稳定实现**。此方案作为可选 smoke，需要人工或 CDP 环境支持。

## 4. 方案 B：Vitest fallback 单测（必做）

### 4.1 代码调整

为了可测，把 background 的发送逻辑抽到新文件：

- 新增 `lib/panel_messaging.ts`

导出：

```typescript
export interface PanelMessagingBrowser {
    tabs: {
        sendMessage: (tab_id: number, message: unknown) => Promise<unknown>;
    };
    scripting: {
        executeScript: (details: {
            target: { tabId: number };
            files: string[];
        }) => Promise<unknown>;
    };
}

export async function send_toggle_panel_message(
    browser_api: PanelMessagingBrowser,
    tab_id: number,
    message: unknown,
): Promise<void>
```

行为：

1. 先调用 `tabs.sendMessage(tab_id, message)`。
2. 如果成功，不注入。
3. 如果失败，调用 `scripting.executeScript({ target: { tabId: tab_id }, files: ['/content-scripts/content.js'] })`。
4. 注入后再次调用 `tabs.sendMessage(tab_id, message)`。
5. 第二次失败则向上抛错，让 background 显示 `!` badge。

### 4.2 测试文件

新增：`tests/panel_messaging.test.ts`

覆盖：

- 首次 `sendMessage` 成功时不注入。
- 首次失败时注入 content script 并重试。
- 注入后重试仍失败时抛错。
- 注入路径必须是 `/content-scripts/content.js`。

### 4.3 background 接入

`entrypoints/background.ts` 不再内联 `send_toggle_panel_message`，改为：

```typescript
import { send_toggle_panel_message } from '../lib/panel_messaging';
```

调用：

```typescript
await send_toggle_panel_message(browser, tab.id, message);
```

这样 fallback 逻辑由单元测试保护，background 只负责事件和 badge。

## 5. 方案 C：手动测试脚本（辅助）

新增文档或 npm script 输出手动步骤，不做自动化：

1. `npm run build`
2. Chrome 扩展页重新加载 TabsCopy
3. 打开或保留一个普通网页
4. 不刷新网页，点击扩展图标
5. 应看到圆角面板；不应看到 `!` badge

这不能替代自动测试，但作为发布前 checklist。

## 6. 推荐落地

本轮实现只做 **方案 B + 方案 C**。

原因：

- Playwright 直接点击扩展 toolbar 在无头/CI 与普通页面 API 中不稳定。
- 为了 E2E 稳定而暴露 background 测试入口，会污染生产代码。
- 这次真实 bug 的核心逻辑是 fallback：`sendMessage` 失败 → 注入 content script → 重试。该逻辑可用 Vitest 精准覆盖。

Playwright 方案保留为后续增强：如果后续项目已有成熟 Chrome CDP harness，再把真实扩展 UI click 加进去。

## 7. 验收标准

- `tests/panel_messaging.test.ts` 覆盖 fallback 三条路径。
- `npm test` 通过。
- `npm run typecheck` 通过。
- `npm run lint` 通过。
- `npm run format:check` 通过。
- `npm run build` 通过。
- 手动复测：扩展重载后，不刷新普通网页，点击图标能弹出圆角面板。

## 8. 风险

- 该方案不能自动证明浏览器 toolbar 点击路径正常，只证明 fallback 逻辑不会回归。
- 若 WXT 未来改变 content script 输出路径，`/content-scripts/content.js` 测试会失败，提醒同步更新。
