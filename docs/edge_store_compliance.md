# Edge Add-ons Store — Privacy Compliance

## Single Purpose Description

OmniTabs copies tab information (URLs, titles, or formatted combinations) from browser tabs to the clipboard. Users can copy a single tab, all tabs in a window, or all tabs across all windows in various formats (plain text, Markdown, HTML, CSV, JSON, etc.) via right-click context menu, keyboard shortcuts, or the extension popup.

## Permission Justifications

### contextMenus

Creates a right-click context menu ("OmniTabs") with nested options for selecting output format and tab scope, allowing users to copy tab information without opening any UI.

### tabs

Reads tab URLs and titles from the current window or all windows. This is the core data source — without this permission the extension cannot access tab information to copy.

### clipboardWrite

Writes the formatted tab information to the system clipboard. This is the core output mechanism — the extension's sole purpose is to copy tab data to the clipboard.

### storage

Stores user preferences (default format, default scope, keyboard shortcut configuration) via browser.storage.sync so settings persist across sessions and sync across devices.

### commands

Registers keyboard shortcuts (Alt+Shift+C/A/W) so users can copy tab information without using the mouse or opening any popup.

### scripting

Executes clipboard write operations in specific tab contexts when direct clipboard API access is unavailable, as a fallback mechanism to ensure the copy function works reliably across different browser states.

### offscreen

Creates an offscreen document as a fallback for clipboard writes. In Manifest V3, the service worker cannot directly access the clipboard API in all scenarios. The offscreen document provides a document context where navigator.clipboard.writeText() can be called reliably.
