import type { Scope, TabInfo } from './types';

export interface TabData {
    title?: string;
    url?: string;
    pendingUrl?: string;
    index: number;
    active: boolean;
    pinned: boolean;
}

export function getTabQuery(scope: Scope): Record<string, unknown> {
    switch (scope) {
        case 'current':
            return { active: true, currentWindow: true };
        case 'window':
            return { currentWindow: true };
        case 'all_windows':
            return {};
        case 'left':
            return { currentWindow: true };
        case 'right':
            return { currentWindow: true };
        case 'except_current':
            return { currentWindow: true };
    }
}

function toTabInfo(tab: TabData): TabInfo {
    return {
        title: (tab.title !== '' ? tab.title : undefined) ?? 'Untitled',
        url: tab.url ?? tab.pendingUrl ?? '',
    };
}

export function filterTabs(tabs: TabData[], scope: Scope, includePinned: boolean): TabInfo[] {
    let filtered = [...tabs];

    switch (scope) {
        case 'current':
            filtered = filtered.filter((t) => t.active);
            break;
        case 'window':
            break;
        case 'all_windows':
            break;
        case 'left': {
            const activeTab = filtered.find((t) => t.active);
            if (!activeTab) return [];
            filtered = filtered.filter((t) => t.index < activeTab.index);
            break;
        }
        case 'right': {
            const activeTab = filtered.find((t) => t.active);
            if (!activeTab) return [];
            filtered = filtered.filter((t) => t.index > activeTab.index);
            break;
        }
        case 'except_current':
            filtered = filtered.filter((t) => !t.active);
            break;
    }

    if (!includePinned) {
        filtered = filtered.filter((t) => !t.pinned);
    }

    return filtered.map(toTabInfo);
}
