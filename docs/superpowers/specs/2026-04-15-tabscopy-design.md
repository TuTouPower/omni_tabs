# TabsCopy Browser Extension — Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Target Browsers:** Chrome, Edge, Firefox

---

## Overview

TabsCopy is a cross-browser extension that lets users copy tab information to the clipboard in 8 formats via a 3-level context menu, keyboard shortcuts, or quick copy with saved defaults.

## Tech Stack

- **Framework:** WXT (Web Extension Tools) — abstracts MV2/MV3 differences
- **Language:** TypeScript
- **Build:** WXT built-in (Vite-based)
- **Storage:** `chrome.storage.sync` for settings

## Project Structure

```
tabs_copy/
├── wxt.config.ts
├── package.json
├── entrypoints/
│   ├── background.ts          # Context menu + shortcuts + copy logic
│   └── popup/
│       ├── App.html
│       ├── main.ts            # Popup entry
│       └── settings.ts        # Settings component
├── lib/
│   ├── formatters.ts          # 8 format implementations
│   ├── tab_scopes.ts          # 6 scope filters
│   ├── clipboard.ts           # Clipboard write
│   └── storage.ts             # Settings read/write
└── public/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Context Menu Design

Three-level cascade:

```
TabsCopy
├── URL
│   ├── Current tab
│   ├── Current window
│   ├── All windows
│   ├── Left tabs
│   ├── Right tabs
│   └── Except current
├── Title: URL
│   └── (same 6 scopes)
├── Title & URL
├── Title
├── Markdown
├── CSV
├── JSON
├── HTML
└── HTML Table
    └── (same 6 scopes)
```

**Menu ID encoding:** `tabscopy_{format}_{scope}` — background parses format and scope directly from the ID with no extra state.

Example IDs: `tabscopy_markdown_current`, `tabscopy_json_all_windows`, `tabscopy_csv_left`.

## Popup Settings Panel

Width: 320px. Contains:

1. **Default format** — tag/chip selector, one active. Markdown default.
2. **Default scope** — dropdown select. "All windows" default.
3. **Include pinned tabs** — toggle switch, off by default.
4. **Keyboard shortcuts** — display list with link to browser's shortcut settings.

## Keyboard Shortcuts

Multiple shortcuts, user-customizable via browser settings:

| Action | Default | Command ID |
|--------|---------|------------|
| Copy current tab | Alt+Shift+C | `copy-current` |
| Copy current window | Alt+Shift+A | `copy-window` |
| Copy all windows | Alt+Shift+W | `copy-all-windows` |

Shortcuts use the default format and scope from popup settings. Users customize via `chrome://extensions/shortcuts` (Chrome/Edge) or `about:addons` (Firefox).

## Format Outputs

Given tabs: GitHub (`https://github.com`), Google (`https://google.com`), Stack Overflow (`https://stackoverflow.com`):

### URL
```
https://github.com
https://google.com
https://stackoverflow.com
```

### Title
```
GitHub
Google
Stack Overflow
```

### Title: URL
```
GitHub: https://github.com
Google: https://google.com
Stack Overflow: https://stackoverflow.com
```

### Title & URL
```
GitHub
https://github.com

Google
https://google.com

Stack Overflow
https://stackoverflow.com
```

### Markdown
```
- [GitHub](https://github.com)
- [Google](https://google.com)
- [Stack Overflow](https://stackoverflow.com)
```

### CSV
```csv
"title","url"
"GitHub","https://github.com"
"Google","https://google.com"
"Stack Overflow","https://stackoverflow.com"
```

### JSON
```json
[
  {"title": "GitHub", "url": "https://github.com"},
  {"title": "Google", "url": "https://google.com"},
  {"title": "Stack Overflow", "url": "https://stackoverflow.com"}
]
```

### HTML
```html
<ul>
  <li><a href="https://github.com">GitHub</a></li>
  <li><a href="https://google.com">Google</a></li>
  <li><a href="https://stackoverflow.com">Stack Overflow</a></li>
</ul>
```

### HTML Table
```html
<table>
  <thead><tr><th>Title</th><th>URL</th></tr></thead>
  <tbody>
    <tr><td>GitHub</td><td>https://github.com</td></tr>
    <tr><td>Google</td><td>https://google.com</td></tr>
    <tr><td>Stack Overflow</td><td>https://stackoverflow.com</td></tr>
  </tbody>
</table>
```

## Scope Definitions

| Scope | ID | Behavior |
|-------|----|----------|
| Current tab | `current` | Only the active tab |
| Current window | `window` | All tabs in current window |
| All windows | `all_windows` | All tabs across all windows (includes current) |
| Left tabs | `left` | Tabs to the left of current tab in current window |
| Right tabs | `right` | Tabs to the right of current tab in current window |
| Except current | `except_current` | All tabs in current window except the active one |

All scopes exclude pinned tabs by default unless the setting is enabled.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Clipboard permission denied | Badge shows `!`, clears after 3s |
| No tabs in selected scope | Badge shows `0`, no clipboard write |
| Tab title contains special chars | CSV/JSON escape quotes/commas; HTML escape `<&>` |
| Tab not fully loaded | `title` falls back to `"Untitled"`, `url` falls back to `pendingUrl` |

## Feedback

- **On success:** Extension badge shows count of copied tabs (e.g., `5`), clears after 3 seconds.
- **On error:** Badge shows `!` or `0`, clears after 3 seconds.
- No system notifications. No sounds.

## Cross-Browser Strategy

WXT handles the MV2/MV3 split at build time:

- **Chrome / Edge:** Manifest V3 output. Uses `chrome.*` APIs.
- **Firefox:** Manifest V2 output. Uses `browser.*` APIs.
- **Code:** Single codebase using WXT's `browser` global, which maps to the correct namespace per build target.

Build commands:
```bash
wxt build              # Chrome (default)
wxt build --browser firefox  # Firefox
wxt build --browser edge     # Edge (same as Chrome)
```

## Data Flow

```
Trigger (context menu click / shortcut)
  → Background script receives event
  → Parse format + scope from menu ID (or read defaults from storage for shortcuts)
  → Query tabs via browser.tabs.query with scope filter
  → Filter pinned tabs if setting is off
  → Format tabs via selected formatter
  → Write to clipboard via navigator.clipboard.writeText
  → Set badge text to count, clear after 3s
```
