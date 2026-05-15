import { createServer } from 'node:http';
import path from 'node:path';
import { type BrowserContext, chromium, expect, test } from '@playwright/test';

declare const chrome: {
    tabs: {
        query: (query: { active: boolean; currentWindow: boolean }) => Promise<{ id?: number }[]>;
        sendMessage: (tabId: number, message: unknown) => Promise<void>;
    };
};

const EXTENSION_PATH = path.resolve('tests/e2e/../../.output/chrome-mv3');

function start_static_server(html: string): Promise<{ url: string; close: () => void }> {
    return new Promise((resolve) => {
        const server = createServer((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        });
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            if (typeof addr === 'object' && addr) {
                resolve({
                    url: `http://127.0.0.1:${String(addr.port)}`,
                    close: () => server.close(),
                });
            }
        });
    });
}

async function launch_with_extension(): Promise<BrowserContext> {
    return chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
        ],
    });
}

async function get_service_worker(context: BrowserContext) {
    for (let i = 0; i < 20; i++) {
        const sw = context.serviceWorkers()[0];
        if (sw) return sw;
        await new Promise((r) => setTimeout(r, 500));
    }
    return context.waitForEvent('serviceworker', { timeout: 10000 });
}

async function toggle_panel_via_service_worker(context: BrowserContext): Promise<void> {
    const worker = await get_service_worker(context);
    await worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id !== undefined) {
            await chrome.tabs.sendMessage(tab.id, { type: 'tabscopy-toggle-panel' });
        }
    });
}

test.describe('rounded popup smoke', () => {
    test('normal page: action triggers rounded iframe panel', async () => {
        const server = await start_static_server('<html><body><h1>Test Page</h1></body></html>');
        const context = await launch_with_extension();

        try {
            const page = await context.newPage();
            await page.goto(server.url);
            await page.waitForLoadState('domcontentloaded');

            await toggle_panel_via_service_worker(context);

            const panel = page.locator('[data-tabscopy-panel]');
            await expect(panel).toBeVisible({ timeout: 5000 });

            const iframe = panel.locator('iframe');
            await expect(iframe).toBeAttached();
            const src = await iframe.getAttribute('src');
            expect(src).toContain('popup.html');
            const allow = await iframe.getAttribute('allow');
            expect(allow).toContain('clipboard-write');
        } finally {
            await context.close();
            server.close();
        }
    });

    test('iframe copy does not throw permission errors', async () => {
        const server = await start_static_server('<html><body><h1>Copy Test</h1></body></html>');
        const context = await launch_with_extension();

        try {
            const page = await context.newPage();
            const errors: string[] = [];
            page.on('pageerror', (err) => errors.push(err.message));

            await page.goto(server.url);
            await page.waitForLoadState('domcontentloaded');

            await toggle_panel_via_service_worker(context);

            const panel = page.locator('[data-tabscopy-panel]');
            await expect(panel).toBeVisible({ timeout: 5000 });

            const iframe = panel.locator('iframe');
            await iframe.waitFor({ state: 'attached', timeout: 5000 });
            await page.waitForTimeout(2000);

            const permission_errors = errors.filter(
                (e) =>
                    e.includes('NotAllowedError') ||
                    e.includes('Clipboard API has been blocked') ||
                    e.includes('permissions policy'),
            );
            expect(permission_errors).toHaveLength(0);
        } finally {
            await context.close();
            server.close();
        }
    });

    test('extension reload: old page can still open panel', async () => {
        const server = await start_static_server('<html><body><h1>Reload Test</h1></body></html>');
        const context = await launch_with_extension();

        try {
            const page = await context.newPage();
            await page.goto(server.url);
            await page.waitForLoadState('domcontentloaded');

            await toggle_panel_via_service_worker(context);
            const panel = page.locator('[data-tabscopy-panel]');
            await expect(panel).toBeVisible({ timeout: 5000 });

            await page.keyboard.press('Escape');
            await expect(panel).not.toBeAttached({ timeout: 3000 });

            await toggle_panel_via_service_worker(context);
            await expect(panel).toBeVisible({ timeout: 5000 });
        } finally {
            await context.close();
            server.close();
        }
    });

    test('restricted page: no injected panel', async () => {
        const context = await launch_with_extension();

        try {
            await get_service_worker(context);

            const page = await context.newPage();
            await page.goto('chrome://extensions');
            await page.waitForLoadState('domcontentloaded');

            const panel = page.locator('[data-tabscopy-panel]');
            await expect(panel).not.toBeAttached({ timeout: 2000 });
        } finally {
            await context.close();
        }
    });
});
