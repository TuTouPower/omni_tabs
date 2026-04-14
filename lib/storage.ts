import type { Settings, Format, Scope } from './types';
import { DEFAULT_SETTINGS } from './types';

const STORAGE_KEY = 'tabscopy_settings';

export async function loadSettings(): Promise<Settings> {
    const result = await browser.storage.sync.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as Record<string, unknown> | undefined;
    if (!stored) return { ...DEFAULT_SETTINGS };
    return {
        defaultFormat: (stored.defaultFormat as Format) ?? DEFAULT_SETTINGS.defaultFormat,
        defaultScope: (stored.defaultScope as Scope) ?? DEFAULT_SETTINGS.defaultScope,
        includePinned: (stored.includePinned as boolean) ?? DEFAULT_SETTINGS.includePinned,
    };
}

export async function saveSettings(settings: Settings): Promise<void> {
    await browser.storage.sync.set({ [STORAGE_KEY]: settings });
}
