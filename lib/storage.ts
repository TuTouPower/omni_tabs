import type { Format, Scope, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';

const STORAGE_KEY = 'omni_tabs_settings';

export async function loadSettings(): Promise<Settings> {
    const result = await browser.storage.sync.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as Record<string, unknown> | undefined;
    if (!stored) return { ...DEFAULT_SETTINGS };
    return {
        defaultFormat: (typeof stored.defaultFormat === 'string'
            ? stored.defaultFormat
            : DEFAULT_SETTINGS.defaultFormat) as Format,
        defaultScope: (typeof stored.defaultScope === 'string'
            ? stored.defaultScope
            : DEFAULT_SETTINGS.defaultScope) as Scope,
        includePinned:
            typeof stored.includePinned === 'boolean'
                ? stored.includePinned
                : DEFAULT_SETTINGS.includePinned,
    };
}

export async function saveSettings(settings: Settings): Promise<void> {
    await browser.storage.sync.set({ [STORAGE_KEY]: settings });
}
