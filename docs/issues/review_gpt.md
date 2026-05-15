# 审阅：TabsCopy 圆角 Popup iframe 注入面板设计

## 总览

设计目标明确：原生扩展 popup 无法靠 CSS 做真实圆角，因此改用 content script 注入 iframe 面板。方向合理，能复用现有 `popup.html` / `main.ts`，避免重写 UI 和复制逻辑。

## 结论

建议通过方案方向，但实现前需补强以下风险点。尤其是 `web_accessible_resources`、`action.setPopup` 动态切换、iframe 与页面通信边界。

## 主要问题

### 1. `web_accessible_resources` 暴露范围过宽

文档建议 `matches: ['<all_urls>']` 暴露 `popup.html` 及 chunk/css。功能上可行，但会让任意页面加载扩展 popup 页面。

风险：
- 扩展 UI 可被第三方页面嵌入观察尺寸、状态变化。
- popup 页面若未来增加敏感状态，暴露面会扩大。
- 需要确认 iframe 内逻辑不会根据页面 origin 信任外部消息。

建议：
- 在 `main.ts` 的 `message` 监听中校验 `event.origin` / `event.source`，只接受同一 iframe 生命周期中预期父窗口的高度请求或最小消息集。
- content script 与 iframe 通信只用固定 `type`，忽略所有未知消息。
- 审查 popup 内是否会把扩展状态泄露给父页面。

### 2. `action.setPopup` 动态切换状态容易不同步

方案依赖普通页设置 `popup: ''`，受限页设置 `popup: 'popup.html'`。这需要覆盖 tab 激活、URL 更新、窗口切换、扩展启动后的初始状态。

风险：
- 安装后或浏览器重启后，当前 tab 状态未及时更新，点击扩展图标行为错误。
- 从普通页跳到 `chrome://` 或反向跳转时 popup 状态滞后。

建议：
- 明确监听 `tabs.onActivated`、`tabs.onUpdated`、`windows.onFocusChanged`、`runtime.onStartup`、`runtime.onInstalled`。
- `onClicked` 内也重新判断当前 URL，作为最后防线。
- 为 `is_restricted_url` 增加完整单测。

### 3. iframe 高度自适应需要防抖和上限

文档只写 `postMessage` 回传高度，但没有约束频率和范围。

风险：
- popup 内主题切换、字体变化、状态提示可能频繁触发高度变化。
- 页面样式或异常内容导致 iframe 高度过大，遮挡页面。

建议：
- 使用 `ResizeObserver`，并用 `requestAnimationFrame` 合并高度上报。
- content script 侧设置高度上下限，例如 `min-height` 和 `max-height: calc(100vh - 24px)`。
- 超出时 iframe 内滚动，不让外层无限增高。

### 4. 点外关闭与 Esc 需处理 iframe 焦点

点外关闭在父页面可做，但 Esc 在 iframe 聚焦时，父页面未必收到键盘事件。

建议：
- iframe 内监听 Esc，向父窗口发送关闭消息。
- 父页面也监听 Esc，覆盖焦点在页面时的场景。
- 关闭消息必须校验来源和 `type`。

### 5. 测试计划缺少浏览器级验证细节

文档有手动验证清单，但还不够覆盖本方案的高风险路径。

建议补充：
- `http://` / `https://` 普通页点击图标。
- `chrome://extensions`、Chrome Web Store、扩展自身页面回退原生 popup。
- 页面已有极高 `z-index` 元素时面板仍可见。
- iframe 内复制、主题切换、置顶开关、快捷键入口都可用。
- Esc、点外关闭、重复点击图标切换显示/关闭。
- 构建后检查 manifest 中 `web_accessible_resources` 是否含 `popup.html`、JS chunk、CSS。

## 代码风格与项目约定

- 新增文件名建议用 `snake_case`，例如 `lib/url_rules.ts`，符合用户全局约定。
- 当前项目已有测试被移动到 `docs/tests/` 且根 `tests/*.test.ts` 显示删除，实施前需确认测试目录迁移是否有意。否则新增测试可能不会被 vitest 默认发现。
- 不应改动 `lib/*` 逻辑层这个约束合理，但新增 `lib/url_rules.ts` 属于规则纯函数，需在文档中明确这是例外且只服务 URL 判定。

## 安全检查

无直接敏感数据处理。主要安全点是扩展页面作为 web accessible iframe 暴露给所有页面。实现时必须把 iframe 消息协议做成白名单，不接受任意父页面命令。

## 建议验收标准

- `npx vitest run` 通过。
- `npx wxt build` 通过。
- 构建产物 manifest 手动确认普通页 iframe 能加载 `popup.html` 及资源。
- Chrome 手动验证普通页圆角面板、受限页原生回退、复制功能、关闭行为、主题切换。

## 最终建议

可以按该设计推进，但先补充消息校验、动态 popup 状态同步、iframe 高度边界、Esc 焦点处理和测试目录确认。否则实现后最可能卡在普通页/受限页切换不稳定，以及 iframe 资源加载或消息边界问题。
