[English](README.md) | [中文](README_zh.md)

# OmniTabs

A browser extension that copies tab information to the clipboard in various formats. Supports Chrome, Edge, and Firefox.

## Features

- **9 output formats**: URL, Title: URL, Title & URL, Title, Markdown, CSV, JSON, HTML, HTML Table
- **6 scope options**: Current Tab, Current Window, All Windows, Tabs to the Left, Tabs to the Right, Except Current Tab
- **Context menu**: Right-click any page to select format and scope
- **Keyboard shortcuts**: `Alt+Shift+C` (current tab), `Alt+Shift+A` (current window), `Alt+Shift+W` (all windows)
- **Popup panel**: Set default format/scope, quick copy button, shortcut config entry
- **Badge feedback**: Shows copied tab count on the extension icon for 3 seconds
- **Bilingual**: English and Chinese (auto-detects browser language)

## Format Examples

Given two tabs: "GitHub" (`github.com`) and "Google" (`google.com`):

| Format | Output |
|--------|--------|
| URL | `github.com`<br>`google.com` |
| Title: URL | `GitHub: github.com`<br>`Google: google.com` |
| Title & URL | `GitHub`<br>`github.com`<br><br>`Google`<br>`google.com` |
| Title | `GitHub`<br>`Google` |
| Markdown | `- [GitHub](github.com)`<br>`- [Google](google.com)` |
| CSV | `"title","url"`<br>`"GitHub","github.com"`<br>`"Google","google.com"` |
| JSON | `[{"title":"GitHub","url":"github.com"}, ...]` |
| HTML | `<ul><li><a href="...">...</a></li></ul>` |
| HTML Table | `<table>...</table>` |

## Install (Developer Mode)

OmniTabs is not yet on the Chrome Web Store. You can install it by downloading from [GitHub Releases](https://github.com/TuTouPower/omni_tabs/releases) or building from source.

### Method 1: Download from Release (Recommended)

1. Go to [Releases](https://github.com/TuTouPower/omni_tabs/releases) and download the latest zip:
   - **Chrome / Edge**: `omnitabs-*-chrome.zip`
2. Unzip the downloaded file — you will get a folder (e.g. `chrome-mv3`)
3. Open `chrome://extensions` (or `edge://extensions` in Edge)
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked**
6. Select the unzipped folder
7. OmniTabs icon appears in the toolbar

### Method 2: Build from Source

- [Node.js](https://nodejs.org/) 18+ and npm

```bash
git clone https://github.com/TuTouPower/omni_tabs.git
cd omni_tabs
npm install
npm run build
```

The built extension is at `.output/chrome-mv3/`. Then follow steps 3–7 above.

### Firefox

1. Go to [Releases](https://github.com/TuTouPower/omni_tabs/releases) and download `omnitabs-*-firefox.zip`
2. Unzip the file
3. Open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on**
5. Select `manifest.json` from the unzipped folder
6. Note: temporary add-ons are removed when Firefox closes

## Package for Store Submission

```bash
npm run zip           # Chrome → .output/omnitabs-{version}-chrome.zip
npm run zip:firefox   # Firefox → .output/omnitabs-{version}-firefox.zip + sources.zip
```

## Usage

### Context Menu

1. Right-click on any web page
2. Hover over **OmniTabs**
3. Select a format, then a scope
4. Tab info is copied to clipboard

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+C` | Copy current tab (default format) |
| `Alt+Shift+A` | Copy current window (default format) |
| `Alt+Shift+W` | Copy all windows (default format) |

To customize shortcuts: go to `chrome://extensions/shortcuts`.

### Popup

Click the OmniTabs icon in the toolbar to:
- Change default format and scope
- Toggle "Include pinned tabs"
- Click **Copy Now** to copy with current settings
- Open browser shortcut settings

## Development

```bash
npm install
npm run dev          # dev server with hot reload (Chrome)
npm run dev:firefox  # dev server (Firefox)
npm run test         # run unit tests
npm run build        # production build
```

## Tech Stack

- **Framework**: [WXT](https://wxt.dev/) (abstracts MV2/MV3 differences)
- **Language**: TypeScript
- **Build**: Vite (via WXT)
- **Test**: Vitest

## License

MIT
