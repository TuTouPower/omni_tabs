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

function setBadge(text: string): void {
    void browser.action.setBadgeText({ text });
    setTimeout(() => {
        void browser.action.setBadgeText({ text: '' });
    }, 3000);
}

async function copyTabs(format: Format, scope: Scope, settings: Settings): Promise<number> {
    const query = getTabQuery(scope);
    const tabs = (await browser.tabs.query(query)) as TabData[];
    const tabInfos = filterTabs(tabs, scope, settings.includePinned);

    if (tabInfos.length === 0) {
        setBadge('0');
        return 0;
    }

    const text = formatTabs(format, tabInfos);

    try {
        await writeToClipboard(text);
        setBadge(String(tabInfos.length));
        return tabInfos.length;
    } catch {
        setBadge('!');
        throw new Error('Clipboard write failed');
    }
}

function registerContextMenus(): void {
    browser.contextMenus.removeAll(() => {
        // Root menu
        browser.contextMenus.create({
            id: 'tabscopy',
            title: browser.i18n.getMessage('menuRootLabel') || 'TabsCopy',
            contexts: ['page'],
        });

        // Format level (2nd level)
        for (const format of FORMATS) {
            const formatId = `tabscopy_${format}`;
            browser.contextMenus.create({
                id: formatId,
                title: getFormatLabel(format),
                parentId: 'tabscopy',
                contexts: ['page'],
            });

            // Scope level (3rd level)
            for (const scope of SCOPES) {
                browser.contextMenus.create({
                    id: buildMenuId(format, scope),
                    title: getScopeLabel(scope),
                    parentId: formatId,
                    contexts: ['page'],
                });
            }
        }
    });
}

function handleContextMenuClick(): void {
    browser.contextMenus.onClicked.addListener((info: Browser.contextMenus.OnClickData) => {
        const parsed = parseMenuId(info.menuItemId as string);
        if (!parsed) return;

        void loadSettings().then(async (settings) => {
            await copyTabs(parsed.format, parsed.scope, settings);
        });
    });
}

function handleCommands(): void {
    browser.commands.onCommand.addListener((command: string) => {
        const scopeMap: Record<string, Scope> = {
            'copy-current': 'current',
            'copy-window': 'window',
            'copy-all-windows': 'all_windows',
        };

        const scope = scopeMap[command];
        if (!scope) return;

        void loadSettings().then(async (settings) => {
            await copyTabs(settings.defaultFormat, scope, settings);
        });
    });
}

function handleMessages(): void {
    browser.runtime.onMessage.addListener(
        (
            message: { type: string; settings?: Settings },
            _sender: Browser.runtime.MessageSender,
            sendResponse: (response: { success: boolean; count?: number; error?: string }) => void,
        ) => {
            if (message.type === 'copyWithSettings' && message.settings) {
                const settings = message.settings;
                copyTabs(settings.defaultFormat, settings.defaultScope, settings)
                    .then((count) => {
                        sendResponse({ success: true, count });
                    })
                    .catch((err: unknown) => {
                        sendResponse({ success: false, error: String(err) });
                    });
                return true;
            }
            return false;
        },
    );
}

export default defineBackground(() => {
    void browser.action.setBadgeBackgroundColor({ color: '#1f6feb' });
    registerContextMenus();
    handleContextMenuClick();
    handleCommands();
    handleMessages();
});
