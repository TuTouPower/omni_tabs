# TabsCopy Rounded Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the browser-native square extension popup on normal web pages with a rounded iframe panel injected by a content script, while preserving the native popup fallback on restricted pages.

**Architecture:** Keep the existing popup UI and copy logic inside `entrypoints/popup/main.ts`; normal pages receive an injected wrapper + iframe from `entrypoints/content.ts`. `entrypoints/background.ts` dynamically switches `browser.action` between native popup fallback and `action.onClicked` dispatch based on URL rules in `lib/url_rules.ts`.

**Tech Stack:** WXT 0.20, TypeScript, WebExtension `browser.*` APIs, Vitest, Chromium MV3 with Firefox compatibility where WXT supports it.

---

## File Structure

- Create: `lib/url_rules.ts`
  - Pure URL restriction helper for native popup fallback decisions.
- Create: `tests/url_rules.test.ts`
  - Unit tests for restricted URL detection.
- Create: `entrypoints/content.ts`
  - Content script. Owns iframe panel lifecycle, close behavior, resize messages, and message whitelist.
- Modify: `entrypoints/background.ts`
  - Adds dynamic popup state sync and `action.onClicked` toggle dispatch.
  - Keeps context menu, shortcut, and runtime copy behavior unchanged.
- Modify: `entrypoints/popup/main.ts`
  - Adds embedded-mode resize reporting and iframe-focused Escape close forwarding.
  - Leaves existing copy/settings/theme behavior intact.
- Modify: `entrypoints/popup/style.css`
  - Removes ineffective native popup radius clipping.
  - Adds embedded-mode internal scroll behavior.
- Modify: `wxt.config.ts`
  - Adds explicit content script registration if WXT auto-discovery is insufficient.
  - Adds `web_accessible_resources` for `popup.html` and built assets.

## Pre-flight Check

- [ ] **Step 1: Confirm test location before writing tests**

Run:

```bash
npx vitest run
```

Expected:

```text
Vitest runs existing tests or reports no test files found.
```

If existing tests are not found because they live under `docs/tests/`, use `tests/url_rules.test.ts` for new tests and do not move existing files in this feature.

- [ ] **Step 2: Confirm build baseline**

Run:

```bash
npm run build
```

Expected:

```text
wxt build completes successfully before changes.
```

Do not fix unrelated baseline failures in this plan. Stop and report them.

---

### Task 1: Restricted URL Rules

**Files:**
- Create: `lib/url_rules.ts`
- Create: `tests/url_rules.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/url_rules.test.ts`:

`file://` is treated as restricted because Chrome blocks extension access to file URLs unless the user manually enables "Allow access to file URLs". `moz-extension://` is treated as restricted for Firefox extension pages.

```typescript
import { describe, expect, it } from 'vitest';
import { is_restricted_url } from '../lib/url_rules';

describe('is_restricted_url', () => {
    it.each([
        undefined,
        '',
        'chrome://extensions',
        'chrome-extension://abc/popup.html',
        'edge://extensions',
        'about:blank',
        'devtools://devtools/bundled/inspector.html',
        'view-source:https://example.com',
        'https://chrome.google.com/webstore/detail/example',
        'https://chromewebstore.google.com/detail/example',
        'moz-extension://abc/popup.html',
        'file:///tmp/example.html',
    ])('returns true for restricted url %s', (url) => {
        expect(is_restricted_url(url)).toBe(true);
    });

    it.each([
        'https://example.com',
        'http://localhost:3000',
    ])('returns false for injectable url %s', (url) => {
        expect(is_restricted_url(url)).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/url_rules.test.ts
```

Expected:

```text
FAIL  tests/url_rules.test.ts
Error: Failed to resolve import "../lib/url_rules"
```

- [ ] **Step 3: Write minimal implementation**

Create `lib/url_rules.ts`:

```typescript
const RESTRICTED_URL_PREFIXES = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'devtools://',
    'view-source:',
    'moz-extension://',
    'file://',
    'https://chrome.google.com/webstore',
    'https://chromewebstore.google.com',
];

export function is_restricted_url(url: string | undefined): boolean {
    if (!url) return true;

    return RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run tests/url_rules.test.ts
```

Expected:

```text
PASS  tests/url_rules.test.ts
```

- [ ] **Step 5: Review diff**

Run:

```bash
git diff -- lib/url_rules.ts tests/url_rules.test.ts
```

Expected:

```text
Only URL rule implementation and its test changed.
```

---

### Task 2: Dynamic Action Popup State

**Files:**
- Modify: `entrypoints/background.ts`
- Test: `tests/url_rules.test.ts` from Task 1 covers URL rules.

- [ ] **Step 1: Add imports and helper types**

Modify the imports at the top of `entrypoints/background.ts`:

```typescript
import { writeToClipboard } from '../lib/clipboard';
import { formatTabs } from '../lib/formatters';
import { loadSettings } from '../lib/storage';
import { filterTabs, getTabQuery, type TabData } from '../lib/tab_scopes';
import type { Format, Scope, Settings } from '../lib/types';
import {
    buildMenuId,
    FORMATS,
    getFormatLabel,
    getScopeLabel,
    parseMenuId,
    SCOPES,
} from '../lib/types';
import { is_restricted_url } from '../lib/url_rules';
```

Add these types below imports:

```typescript
interface TogglePanelMessage {
    type: 'tabscopy-toggle-panel';
}
```

- [ ] **Step 2: Add popup state helpers**

Add below `setBadge`:

```typescript
async function get_active_tab(): Promise<Browser.tabs.Tab | undefined> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab;
}

async function sync_popup_state(tab: Browser.tabs.Tab | undefined): Promise<void> {
    const popup = is_restricted_url(tab?.url) ? 'popup.html' : '';

    if (tab?.id === undefined) {
        await browser.action.setPopup({ popup });
        return;
    }

    await browser.action.setPopup({ tabId: tab.id, popup });
}

async function sync_active_popup_state(): Promise<void> {
    await sync_popup_state(await get_active_tab());
}
```

- [ ] **Step 3: Add action click handler**

Add below `handleMessages`:

```typescript
function handle_action_click(): void {
    browser.action.onClicked.addListener((tab) => {
        void (async () => {
            await sync_popup_state(tab);

            if (is_restricted_url(tab.url) || tab.id === undefined) return;

            const message: TogglePanelMessage = { type: 'tabscopy-toggle-panel' };
            await browser.tabs.sendMessage(tab.id, message).catch(() => undefined);
        })();
    });
}
```

- [ ] **Step 4: Add popup state listeners**

Add below `handle_action_click`:

```typescript
function handle_popup_state_sync(): void {
    browser.tabs.onActivated.addListener(({ tabId }) => {
        void browser.tabs.get(tabId).then(sync_popup_state).catch(() => undefined);
    });

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (!changeInfo.url) return;
        void sync_popup_state({ ...tab, id: tabId });
    });

    browser.windows.onFocusChanged.addListener((windowId) => {
        if (windowId === browser.windows.WINDOW_ID_NONE) return;
        void sync_active_popup_state().catch(() => undefined);
    });

    browser.runtime.onStartup.addListener(() => {
        void sync_active_popup_state().catch(() => undefined);
    });

    browser.runtime.onInstalled.addListener(() => {
        void sync_active_popup_state().catch(() => undefined);
    });
}
```

- [ ] **Step 5: Wire handlers in background startup**

Modify the default export block:

```typescript
export default defineBackground(() => {
    void browser.action.setBadgeBackgroundColor({ color: '#1f6feb' });
    void sync_active_popup_state().catch(() => undefined);
    registerContextMenus();
    handleContextMenuClick();
    handleCommands();
    handleMessages();
    handle_action_click();
    handle_popup_state_sync();
});
```

- [ ] **Step 6: Typecheck**

Run:

```bash
npm run typecheck
```

Expected:

```text
tsc exits with code 0.
```

- [ ] **Step 7: Review diff**

Run:

```bash
git diff -- entrypoints/background.ts
```

Expected:

```text
Only background action routing changed; context menus, commands, and copy logic remain intact.
```

---

### Task 3: Content Script Panel Lifecycle

**Files:**
- Create: `entrypoints/content.ts`

- [ ] **Step 1: Create content script with panel lifecycle**

Create `entrypoints/content.ts`:

```typescript
interface TogglePanelMessage {
    type: 'tabscopy-toggle-panel';
}

interface ResizeMessage {
    type: 'tabscopy-resize';
    height: number;
}

interface CloseMessage {
    type: 'tabscopy-close';
}

type PanelMessage = ResizeMessage | CloseMessage;

const PANEL_WIDTH = 320;
const PANEL_OFFSET = 12;
const PANEL_Z_INDEX = 2147483647;

let panel: HTMLDivElement | null = null;
let iframe: HTMLIFrameElement | null = null;
let remove_click_listener: (() => void) | null = null;
let remove_key_listener: (() => void) | null = null;
let remove_message_listener: (() => void) | null = null;

function clamp_height(height: number): number {
    return Math.max(0, Math.min(height, window.innerHeight - PANEL_OFFSET * 2));
}

function is_panel_message(data: unknown): data is PanelMessage {
    if (!data || typeof data !== 'object') return false;

    const message = data as { type?: unknown; height?: unknown };
    if (message.type === 'tabscopy-close') return true;
    return message.type === 'tabscopy-resize' && typeof message.height === 'number';
}

function remove_panel(): void {
    remove_click_listener?.();
    remove_key_listener?.();
    remove_message_listener?.();
    panel?.remove();

    remove_click_listener = null;
    remove_key_listener = null;
    remove_message_listener = null;
    panel = null;
    iframe = null;
}

function attach_close_listeners(): void {
    const click_handler = (event: MouseEvent): void => {
        if (!panel || panel.contains(event.target as Node)) return;
        remove_panel();
    };

    const key_handler = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') remove_panel();
    };

    requestAnimationFrame(() => {
        document.addEventListener('click', click_handler, true);
        remove_click_listener = () => document.removeEventListener('click', click_handler, true);
    });

    document.addEventListener('keydown', key_handler);
    remove_key_listener = () => document.removeEventListener('keydown', key_handler);
}

function attach_message_listener(): void {
    const message_handler = (event: MessageEvent): void => {
        if (!iframe || event.source !== iframe.contentWindow || !is_panel_message(event.data)) return;

        if (event.data.type === 'tabscopy-close') {
            remove_panel();
            return;
        }

        iframe.style.height = `${String(clamp_height(event.data.height))}px`;
    };

    window.addEventListener('message', message_handler);
    remove_message_listener = () => window.removeEventListener('message', message_handler);
}

function create_panel(): void {
    if (panel) return;

    const next_panel = document.createElement('div');
    next_panel.dataset.tabscopyPanel = 'true';
    next_panel.style.position = 'fixed';
    next_panel.style.top = `${String(PANEL_OFFSET)}px`;
    next_panel.style.right = `${String(PANEL_OFFSET)}px`;
    next_panel.style.zIndex = String(PANEL_Z_INDEX);
    next_panel.style.borderRadius = '12px';
    next_panel.style.overflow = 'hidden';
    next_panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
    next_panel.style.width = `${String(PANEL_WIDTH)}px`;
    next_panel.style.maxHeight = `calc(100vh - ${String(PANEL_OFFSET * 2)}px)`;

    const next_iframe = document.createElement('iframe');
    next_iframe.src = browser.runtime.getURL('popup.html');
    next_iframe.style.width = `${String(PANEL_WIDTH)}px`;
    next_iframe.style.height = '0';
    next_iframe.style.maxHeight = `calc(100vh - ${String(PANEL_OFFSET * 2)}px)`;
    next_iframe.style.border = 'none';
    next_iframe.style.display = 'block';

    next_panel.appendChild(next_iframe);
    document.documentElement.appendChild(next_panel);

    panel = next_panel;
    iframe = next_iframe;

    attach_close_listeners();
    attach_message_listener();
}

function is_extension_sender(sender: Browser.runtime.MessageSender): boolean {
    return sender.id === browser.runtime.id;
}

function toggle_panel(): void {
    if (panel) {
        remove_panel();
        return;
    }

    try {
        create_panel();
    } catch (error: unknown) {
        console.error('TabsCopy panel injection failed', error);
    }
}

export default defineContentScript({
    matches: ['<all_urls>'],
    runAt: 'document_idle',
    main() {
        browser.runtime.onMessage.addListener((message: TogglePanelMessage, sender) => {
            if (!is_extension_sender(sender) || message.type !== 'tabscopy-toggle-panel') return false;
            toggle_panel();
            return false;
        });
    },
});
```

Security boundary: web pages cannot directly call `browser.runtime.onMessage`, but the listener still checks `sender.id === browser.runtime.id` so the content script only accepts extension-origin runtime messages.

- [ ] **Step 2: Typecheck**

Run:

```bash
npm run typecheck
```

Expected:

```text
tsc exits with code 0.
```

- [ ] **Step 3: Review diff**

Run:

```bash
git diff -- entrypoints/content.ts
```

Expected:

```text
Only the new content script was added.
```

---

### Task 4: Popup Embedded Mode Resize and Escape

**Files:**
- Modify: `entrypoints/popup/main.ts`
- Modify: `entrypoints/popup/style.css`

- [ ] **Step 1: Add embedded message types and setup function**

Add below the existing `let currentSettings` line in `entrypoints/popup/main.ts`:

```typescript
interface EmbeddedResizeMessage {
    type: 'tabscopy-resize';
    height: number;
}

interface EmbeddedCloseMessage {
    type: 'tabscopy-close';
}

function is_embedded_popup(): boolean {
    return window.parent !== window;
}

function setup_embedded_mode(): void {
    if (!is_embedded_popup()) return;

    document.documentElement.dataset.embedded = 'true';

    let animation_frame = 0;
    const report_height = (): void => {
        if (animation_frame) return;

        animation_frame = requestAnimationFrame(() => {
            animation_frame = 0;
            const message: EmbeddedResizeMessage = {
                type: 'tabscopy-resize',
                height: document.body.scrollHeight,
            };
            window.parent.postMessage(message, '*');
        });
    };

    const observer = new ResizeObserver(report_height);
    observer.observe(document.body);
    report_height();

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        const message: EmbeddedCloseMessage = { type: 'tabscopy-close' };
        window.parent.postMessage(message, '*');
    });
}
```

`postMessage(..., '*')` is intentional here because the iframe can be embedded into arbitrary normal web pages, so the parent origin is not fixed. The security boundary is in `entrypoints/content.ts`: it accepts only messages where `event.source === iframe.contentWindow` and `type` is in the strict whitelist.

- [ ] **Step 2: Initialize embedded mode after DOM is ready**

Modify the bottom of `entrypoints/popup/main.ts`:

```typescript
document.addEventListener('DOMContentLoaded', () => {
    setup_embedded_mode();
    void init();
});
```

- [ ] **Step 3: Remove ineffective radius clipping and add embedded scroll CSS**

In `entrypoints/popup/style.css`, remove `border-radius: 12px` and `overflow: hidden` from `html` and `body` rules.

Add this near the top-level layout rules:

```css
html[data-embedded='true'] {
    overflow: hidden;
}

html[data-embedded='true'] body {
    max-height: calc(100vh - 24px);
    overflow-y: auto;
}
```

- [ ] **Step 4: Typecheck**

Run:

```bash
npm run typecheck
```

Expected:

```text
tsc exits with code 0.
```

- [ ] **Step 5: Review diff**

Run:

```bash
git diff -- entrypoints/popup/main.ts entrypoints/popup/style.css
```

Expected:

```text
Only embedded-mode resize, Escape forwarding, and popup scroll styling changed.
```

---

### Task 5: Manifest Resources and Build Verification

**Files:**
- Modify: `wxt.config.ts`

- [ ] **Step 1: Add explicit web accessible resources**

Modify `wxt.config.ts` manifest block to include `web_accessible_resources`. Do not assume WXT always emits `assets/*`; use extension-root JS/CSS globs first, then verify the built manifest and narrow only if the real build output is known.

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
    srcDir: '.',
    entrypointsDir: 'entrypoints',
    manifest: {
        name: '__MSG_extensionName__',
        description: '__MSG_extensionDescription__',
        default_locale: 'en',
        permissions: [
            'contextMenus',
            'tabs',
            'clipboardWrite',
            'storage',
            'commands',
            'scripting',
            'offscreen',
        ],
        web_accessible_resources: [
            {
                resources: ['popup.html', '**/*.js', '**/*.css'],
                matches: ['<all_urls>'],
            },
        ],
        commands: {
            'copy-current': {
                suggested_key: { default: 'Alt+Shift+C' },
                description: '__MSG_cmdCopyCurrent__',
            },
            'copy-window': {
                suggested_key: { default: 'Alt+Shift+A' },
                description: '__MSG_cmdCopyWindow__',
            },
            'copy-all-windows': {
                suggested_key: { default: 'Alt+Shift+W' },
                description: '__MSG_cmdCopyAllWindows__',
            },
        },
        action: {
            default_icon: {
                '16': 'icon-16.png',
                '48': 'icon-48.png',
                '128': 'icon-128.png',
            },
        },
    },
});
```

- [ ] **Step 2: Build**

Run:

```bash
npm run build
```

Expected:

```text
wxt build completes successfully.
```

- [ ] **Step 3: Inspect built manifest**

Run:

```bash
node -e "const m=require('./.output/chrome-mv3/manifest.json'); console.log(JSON.stringify({action:m.action, content_scripts:m.content_scripts, web_accessible_resources:m.web_accessible_resources}, null, 2))"
```

Expected:

```json
{
  "action": {
    "default_icon": {
      "16": "icon-16.png",
      "48": "icon-48.png",
      "128": "icon-128.png"
    },
    "default_popup": "popup.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["popup.html", "**/*.js", "**/*.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

The exact `content_scripts[*].js` path is generated by WXT and may differ. If Chrome rejects `**` globs or the iframe cannot load its JS/CSS, inspect `.output/chrome-mv3/popup.html` and replace the resources list with the exact emitted JS/CSS paths from that build.

- [ ] **Step 4: Review diff**

Run:

```bash
git diff -- wxt.config.ts
```

Expected:

```text
Only manifest resource exposure changed.
```

---

### Task 6: Automated Checks

**Files:**
- No source changes expected.

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm test
```

Expected:

```text
All Vitest tests pass, including tests/url_rules.test.ts.
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected:

```text
tsc exits with code 0.
```

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected:

```text
ESLint exits with code 0.
```

- [ ] **Step 4: Run format check**

Run:

```bash
npm run format:check
```

Expected:

```text
Biome exits with code 0.
```

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected:

```text
wxt build completes successfully.
```

- [ ] **Step 6: Review formatting-only fixes**

Only if formatting changed files, run:

```bash
git diff -- entrypoints/background.ts entrypoints/content.ts entrypoints/popup/main.ts entrypoints/popup/style.css lib/url_rules.ts tests/url_rules.test.ts wxt.config.ts
```

Expected:

```text
Formatting changes are limited to files touched by this feature.
```

---

### Task 7: Manual Chrome Verification

**Files:**
- No source changes expected unless a verification failure reveals a bug.

- [ ] **Step 1: Load build in Chrome**

Open Chrome extension page and load:

```text
/home/karon/karson_ubuntu/tabs_copy/.output/chrome-mv3
```

Expected:

```text
TabsCopy loads without manifest errors.
```

- [ ] **Step 2: Verify normal HTTPS page**

Open:

```text
https://example.com
```

Click the extension icon.

Expected:

```text
Rounded panel appears at top-right. It is 320px wide. Corners are visibly rounded.
```

- [ ] **Step 3: Verify normal HTTP localhost page**

Open an existing local page, for example:

```text
http://localhost:3000
```

Click the extension icon.

Expected:

```text
Rounded panel appears if the page loads. If localhost server is not running, use another http:// page available in the environment.
```

- [ ] **Step 4: Verify close behavior**

On a normal page:

```text
Click extension icon -> panel opens.
Click extension icon again -> panel closes.
Open again -> click page outside panel -> panel closes.
Open again -> focus page -> press Escape -> panel closes.
Open again -> click inside panel -> press Escape -> panel closes.
```

Expected:

```text
All close paths work. No stuck overlay remains in DOM.
```

- [ ] **Step 5: Verify popup features inside iframe**

Inside the rounded panel:

```text
Change format chips.
Change scope dropdown.
Toggle pinned setting.
Toggle theme.
Open shortcut configuration.
Click Copy Now.
```

Expected:

```text
Settings update, theme changes, shortcut page opens, Copy Now writes clipboard and shows copied status.
```

- [ ] **Step 6: Verify restricted page fallback**

Open:

```text
chrome://extensions
```

Click the extension icon.

Expected:

```text
Native square popup opens. Existing popup functionality works.
```

- [ ] **Step 7: Verify existing copy surfaces**

On a normal page:

```text
Use right-click menu TabsCopy -> any format -> any scope.
Use Alt+Shift+C.
Use Alt+Shift+A.
Use Alt+Shift+W.
```

Expected:

```text
Clipboard copy still works. Badge feedback still appears.
```

- [ ] **Step 8: Review manual-verification fixes only if needed**

If source changes were required after manual verification, run:

```bash
git diff -- entrypoints/background.ts entrypoints/content.ts entrypoints/popup/main.ts entrypoints/popup/style.css wxt.config.ts
```

Expected:

```text
Only fixes directly tied to failed manual checks changed.
```

---

### Task 8: Code Review and Security Review

**Files:**
- No source changes expected unless review finds issues.

- [ ] **Step 1: Run TypeScript reviewer**

Use `typescript-reviewer` agent on changed TypeScript files:

```text
Review entrypoints/background.ts, entrypoints/content.ts, entrypoints/popup/main.ts, lib/url_rules.ts, tests/url_rules.test.ts for type safety, async correctness, and WebExtension API usage.
```

Expected:

```text
No CRITICAL or HIGH issues.
```

- [ ] **Step 2: Run security reviewer**

Use `security-reviewer` agent with this prompt:

```text
Review the rounded popup iframe implementation. Focus on web_accessible_resources exposure, postMessage origin/source validation, content script message handling, and whether a page can command the extension iframe.
```

Expected:

```text
No CRITICAL or HIGH issues. Any MEDIUM issue is either fixed or explicitly accepted.
```

- [ ] **Step 3: Fix review findings**

If reviewers find issues, make focused edits only in affected files, then rerun:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected:

```text
All commands pass.
```

- [ ] **Step 4: Review diff after review fixes**

Only if review fixes changed files, run:

```bash
git diff -- entrypoints/background.ts entrypoints/content.ts entrypoints/popup/main.ts entrypoints/popup/style.css lib/url_rules.ts tests/url_rules.test.ts wxt.config.ts
```

Expected:

```text
Only changes required by review findings are present.
```

---

## Final Verification

- [ ] `npm test` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run format:check` passes.
- [ ] `npm run build` passes.
- [ ] Built manifest contains content script and web accessible popup resources.
- [ ] Manual Chrome checklist from Task 7 passes.
- [ ] No unrelated files changed.
- [ ] `docs/superpowers/specs/2026-05-15-tabscopy-rounded-popup-design.md` still matches implementation.

## Self-Review Notes

- Spec coverage: covered URL fallback, iframe lifecycle, point-outside close, Escape in host and iframe, resize reporting with bounds, copy behavior reuse, style cleanup, WXT resources, risk checks, and test/acceptance criteria.
- Placeholder scan: no unfinished marker text and no unspecified edge-case steps.
- Type consistency: message types are `tabscopy-toggle-panel`, `tabscopy-resize`, and `tabscopy-close` throughout.
