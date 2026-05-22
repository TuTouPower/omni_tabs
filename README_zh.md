[English](README.md) | [中文](README_zh.md)

# OmniTabs

将标签页信息以多种格式复制到剪贴板的浏览器扩展。支持 Chrome、Edge 和 Firefox。

## 功能

- **9 种输出格式**：URL、标题: URL、标题和 URL、标题、Markdown、CSV、JSON、HTML、HTML 表格
- **6 种范围选择**：当前标签页、当前窗口、所有窗口、左侧标签页、右侧标签页、除当前标签页外
- **右键菜单**：右键任意页面即可选择格式和范围
- **快捷键**：`Alt+Shift+C`（当前标签页）、`Alt+Shift+A`（当前窗口）、`Alt+Shift+W`（所有窗口）
- **弹出面板**：设置默认格式/范围、快速复制按钮、快捷键配置入口
- **角标反馈**：复制成功后在扩展图标上显示标签页数量（3 秒）
- **中英文双语**：自动检测浏览器语言

## 格式示例

假设有两个标签页："GitHub"（`github.com`）和 "Google"（`google.com`）：

| 格式 | 输出 |
|------|------|
| URL | `github.com`<br>`google.com` |
| 标题: URL | `GitHub: github.com`<br>`Google: google.com` |
| 标题和 URL | `GitHub`<br>`github.com`<br><br>`Google`<br>`google.com` |
| 标题 | `GitHub`<br>`Google` |
| Markdown | `- [GitHub](github.com)`<br>`- [Google](google.com)` |
| CSV | `"title","url"`<br>`"GitHub","github.com"`<br>`"Google","google.com"` |
| JSON | `[{"title":"GitHub","url":"github.com"}, ...]` |
| HTML | `<ul><li><a href="...">...</a></li></ul>` |
| HTML 表格 | `<table>...</table>` |

## 安装（开发者模式）

OmniTabs 尚未上架 Chrome 应用商店，需要以解压缩方式加载。

### 前置要求

- [Node.js](https://nodejs.org/) 18+ 和 npm

### 从源码构建

```bash
git clone https://github.com/TuTouPower/omni_tabs.git
cd omni_tabs
npm install
npm run build
```

构建产物位于 `.output/chrome-mv3/`。

### 在 Chrome / Edge 中加载

1. 打开 `chrome://extensions`（Edge 打开 `edge://extensions`）
2. 开启**开发者模式**（右上角开关）
3. 点击**加载已解压的扩展程序**
4. 选择 `.output/chrome-mv3/` 文件夹
5. 工具栏出现 OmniTabs 图标

### 在 Firefox 中加载

```bash
npm run zip:firefox
```

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击**临时载入附加组件**
3. 选择 `.output/firefox-mv2/manifest.json`
4. 注意：临时附加组件在 Firefox 关闭后会被移除

## 打包上架

```bash
npm run zip           # Chrome → .output/omnitabs-{version}-chrome.zip
npm run zip:firefox   # Firefox → .output/omnitabs-{version}-firefox.zip + sources.zip
```

## 使用方法

### 右键菜单

1. 在任意网页上右键
2. 将鼠标悬停在 **OmniTabs** 上
3. 选择格式，再选择范围
4. 标签页信息已复制到剪贴板

### 快捷键

| 快捷键 | 操作 |
|--------|------|
| `Alt+Shift+C` | 复制当前标签页（默认格式） |
| `Alt+Shift+A` | 复制当前窗口（默认格式） |
| `Alt+Shift+W` | 复制所有窗口（默认格式） |

自定义快捷键：前往 `chrome://extensions/shortcuts`。

### 弹出面板

点击工具栏上的 OmniTabs 图标可以：

- 切换默认格式和范围
- 开关"包含固定标签页"
- 点击**立即复制**按当前设置复制
- 打开浏览器快捷键设置

## 开发

```bash
npm install
npm run dev          # 开发服务器，支持热更新（Chrome）
npm run dev:firefox  # 开发服务器（Firefox）
npm run test         # 运行单元测试
npm run build        # 生产构建
```

## 技术栈

- **框架**：[WXT](https://wxt.dev/)（抽象 MV2/MV3 差异）
- **语言**：TypeScript
- **构建**：Vite（通过 WXT）
- **测试**：Vitest

## 许可证

MIT
