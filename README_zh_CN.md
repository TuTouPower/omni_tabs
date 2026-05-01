# TabsCopy

浏览器扩展，将标签页信息以多种格式复制到剪贴板。支持 Chrome、Edge 和 Firefox。

## 功能

- **9 种输出格式**: URL、标题: URL、标题和 URL、标题、Markdown、CSV、JSON、HTML、HTML 表格
- **6 种范围选项**: 仅当前标签页、当前窗口全部、所有窗口全部、左侧标签页、右侧标签页、除当前外全部
- **右键菜单**: 在任意页面右键，选择格式和范围即可复制
- **快捷键**: `Alt+Shift+C`（当前标签页）、`Alt+Shift+A`（当前窗口）、`Alt+Shift+W`（所有窗口）
- **弹窗面板**: 设置默认格式/范围、一键复制按钮、快捷键配置入口
- **Badge 反馈**: 复制成功后扩展图标上显示复制的标签页数量（持续 3 秒）
- **中英双语**: 根据浏览器语言自动切换

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

TabsCopy 尚未上架 Chrome 网上应用店，需要以"加载已解压的扩展程序"方式安装。

### 前提条件

- [Node.js](https://nodejs.org/) 18+ 和 npm

### 从源码构建

```bash
git clone <仓库地址> tabs_copy
cd tabs_copy
npm install
npm run build
```

构建产物在 `.output/chrome-mv3/` 目录。

### 在 Chrome / Edge 中加载

1. 打开 `chrome://extensions`（Edge 用户打开 `edge://extensions`）
2. 开启右上角的**开发者模式**开关
3. 点击**加载已解压的扩展程序**
4. 选择 `.output/chrome-mv3/` 文件夹
5. 工具栏中出现 TabsCopy 图标，安装完成

### 在 Firefox 中加载

```bash
npm run build:firefox
```

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击**临时载入附加组件**
3. 选择 `.output/firefox-mv2/manifest.json`
4. 注意：临时扩展在 Firefox 关闭后会被移除

## 使用方法

### 右键菜单

1. 在任意网页上右键
2. 悬停到 **TabsCopy**
3. 选择一种格式，再选择范围
4. 标签页信息已复制到剪贴板

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt+Shift+C` | 复制当前标签页（使用默认格式） |
| `Alt+Shift+A` | 复制当前窗口（使用默认格式） |
| `Alt+Shift+W` | 复制所有窗口（使用默认格式） |

自定义快捷键：前往 `chrome://extensions/shortcuts`。

### 弹窗面板

点击工具栏中的 TabsCopy 图标：
- 修改默认格式和范围
- 切换"包含固定标签页"
- 点击**立即复制**按钮一键复制
- 打开浏览器快捷键设置

## 开发

```bash
npm install
npm run dev          # 开发服务器（Chrome，热重载）
npm run dev:firefox  # 开发服务器（Firefox）
npm run test         # 运行单元测试
npm run build        # 生产构建
```

## 技术栈

- **框架**: [WXT](https://wxt.dev/)（抽象 MV2/MV3 差异）
- **语言**: TypeScript
- **构建**: Vite（通过 WXT）
- **测试**: Vitest

## 许可证

ISC
