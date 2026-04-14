import { FORMATS, SCOPES, FORMAT_LABELS, SCOPE_LABELS, parseMenuId, buildMenuId, getFormatLabel, getScopeLabel } from '../lib/types';
import type { Format, Scope, Settings } from '../lib/types';
import { formatTabs } from '../lib/formatters';
import { getTabQuery, filterTabs, type TabData } from '../lib/tab_scopes';
import { writeToClipboard } from '../lib/clipboard';
import { loadSettings } from '../lib/storage';

function setBadge(text: string): void {
  browser.action.setBadgeText({ text });
  setTimeout(() => {
    browser.action.setBadgeText({ text: '' });
  }, 3000);
}

async function copyTabs(format: Format, scope: Scope, settings: Settings): Promise<void> {
  const query = getTabQuery(scope);
  const tabs = await browser.tabs.query(query) as TabData[];
  const tabInfos = filterTabs(tabs, scope, settings.includePinned);

  if (tabInfos.length === 0) {
    setBadge('0');
    return;
  }

  const text = formatTabs(format, tabInfos);

  try {
    await writeToClipboard(text);
    setBadge(String(tabInfos.length));
  } catch {
    setBadge('!');
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
  browser.contextMenus.onClicked.addListener(async (info) => {
    const parsed = parseMenuId(info.menuItemId as string);
    if (!parsed) return;

    const settings = await loadSettings();
    await copyTabs(parsed.format, parsed.scope, settings);
  });
}

function handleCommands(): void {
  browser.commands.onCommand.addListener(async (command) => {
    const scopeMap: Record<string, Scope> = {
      'copy-current': 'current',
      'copy-window': 'window',
      'copy-all-windows': 'all_windows',
    };

    const scope = scopeMap[command];
    if (!scope) return;

    const settings = await loadSettings();
    await copyTabs(settings.defaultFormat, scope, settings);
  });
}

export default defineBackground(() => {
  browser.action.setBadgeBackgroundColor({ color: '#1f6feb' });
  registerContextMenus();
  handleContextMenuClick();
  handleCommands();
});
