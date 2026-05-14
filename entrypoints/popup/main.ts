import { formatTabs } from '../../lib/formatters';
import { loadSettings, saveSettings } from '../../lib/storage';
import { filterTabs, getTabQuery, type TabData } from '../../lib/tab_scopes';
import type { Scope, Settings } from '../../lib/types';
import { DEFAULT_SETTINGS, FORMATS, getFormatLabel, getScopeLabel, SCOPES } from '../../lib/types';

const SHORTCUTS: {
    command: string;
    labelKey: 'shortcutCopyCurrent' | 'shortcutCopyWindow' | 'shortcutCopyAllWindows';
    defaultKey: string;
}[] = [
    { command: 'copy-current', labelKey: 'shortcutCopyCurrent', defaultKey: 'Alt+Shift+C' },
    { command: 'copy-window', labelKey: 'shortcutCopyWindow', defaultKey: 'Alt+Shift+A' },
    { command: 'copy-all-windows', labelKey: 'shortcutCopyAllWindows', defaultKey: 'Alt+Shift+W' },
];

type ThemeMode = 'system' | 'light' | 'dark';

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

let currentSettings: Settings = { ...DEFAULT_SETTINGS };

function getElement(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element: #${id}`);
    return el;
}

function applyTheme(mode: ThemeMode): void {
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    if (mode === 'light') {
        root.setAttribute('data-theme', 'light');
    } else if (mode === 'dark') {
        root.setAttribute('data-theme', 'dark');
    }
    // 'system' → no attribute, CSS media query handles it

    const dots = document.querySelectorAll<HTMLElement>('.theme-btn');
    for (const dot of dots) {
        dot.classList.toggle('active', dot.dataset.theme === mode);
    }
}

async function loadTheme(): Promise<ThemeMode> {
    const stored = await browser.storage.sync.get('themeMode');
    const val = stored.themeMode;
    if (val === 'light' || val === 'dark') return val;
    return 'system';
}

async function saveTheme(mode: ThemeMode): Promise<void> {
    await browser.storage.sync.set({ themeMode: mode });
}

function initThemeToggle(): void {
    const toggle = getElement('theme-toggle');

    void loadTheme().then((mode) => {
        applyTheme(mode);

        toggle.addEventListener('click', () => {
            void loadTheme().then((current) => {
                const idx = THEME_CYCLE.indexOf(current);
                const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length] ?? 'system';
                applyTheme(next);
                void saveTheme(next);
            });
        });
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        void loadTheme().then((mode) => {
            if (mode === 'system') applyTheme('system');
        });
    });
}

async function init(): Promise<void> {
    getElement('subtitle').textContent =
        browser.i18n.getMessage('popupSubtitle') || 'Smart Tab Copier';
    getElement('label-format').textContent =
        browser.i18n.getMessage('settingDefaultFormat') || 'Default Format';
    getElement('label-scope').textContent =
        browser.i18n.getMessage('settingDefaultScope') || 'Default Scope';
    getElement('label-pinned').textContent =
        browser.i18n.getMessage('settingIncludePinned') || 'Include Pinned Tabs';
    getElement('label-shortcuts').textContent =
        browser.i18n.getMessage('shortcutsTitle') || 'Shortcuts';

    // Copy button
    const copyBtn = getElement('copy-btn') as HTMLButtonElement;
    copyBtn.textContent = browser.i18n.getMessage('copyButton') || 'Copy Now';
    copyBtn.addEventListener('click', () => {
        void handleCopy();
    });

    // Configure shortcuts button
    const configBtn = getElement('configure-shortcuts-btn');
    configBtn.textContent = browser.i18n.getMessage('configureShortcuts') || 'Configure Shortcuts';
    configBtn.addEventListener('click', () => {
        void browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });

    currentSettings = await loadSettings();
    renderFormatChips();
    renderScopeSelect();
    renderPinnedToggle();
    renderShortcuts();
    initThemeToggle();
}

async function handleCopy(): Promise<void> {
    const copyBtn = getElement('copy-btn') as HTMLButtonElement;
    const status = getElement('copy-status');

    copyBtn.disabled = true;
    status.classList.remove('status-warning', 'status-error');

    try {
        const query = getTabQuery(currentSettings.defaultScope);
        const tabs = (await browser.tabs.query(query)) as TabData[];
        const tabInfos = filterTabs(
            tabs,
            currentSettings.defaultScope,
            currentSettings.includePinned,
        );

        if (tabInfos.length === 0) {
            status.textContent = browser.i18n.getMessage('noTabs') || 'No tabs found';
            status.classList.add('status-warning');
            return;
        }

        const text = formatTabs(currentSettings.defaultFormat, tabInfos);
        await navigator.clipboard.writeText(text);

        copyBtn.classList.add('copied');
        copyBtn.textContent = browser.i18n.getMessage('copyButtonDone') || 'Copied!';
        status.textContent = `${String(tabInfos.length)} ${browser.i18n.getMessage('tabsCopied') || 'tabs copied'}`;

        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.textContent = browser.i18n.getMessage('copyButton') || 'Copy Now';
            status.textContent = '';
            status.classList.remove('status-warning', 'status-error');
        }, 2000);
    } catch (err: unknown) {
        status.textContent = String(err);
        status.classList.add('status-error');
    } finally {
        copyBtn.disabled = false;
    }
}

function renderFormatChips(): void {
    const container = getElement('format-chips');
    container.innerHTML = '';

    for (const format of FORMATS) {
        const chip = document.createElement('span');
        chip.className = `chip${format === currentSettings.defaultFormat ? ' active' : ''}`;
        chip.textContent = getFormatLabel(format);
        chip.addEventListener('click', () => {
            currentSettings.defaultFormat = format;
            void saveSettings(currentSettings);
            renderFormatChips();
        });
        container.appendChild(chip);
    }
}

function renderScopeSelect(): void {
    const select = getElement('scope-select') as HTMLSelectElement;
    select.innerHTML = '';

    for (const scope of SCOPES) {
        const option = document.createElement('option');
        option.value = scope;
        option.textContent = getScopeLabel(scope);
        if (scope === currentSettings.defaultScope) option.selected = true;
        select.appendChild(option);
    }

    select.addEventListener('change', () => {
        currentSettings.defaultScope = select.value as Scope;
        void saveSettings(currentSettings);
    });
}

function renderPinnedToggle(): void {
    const toggle = getElement('pinned-toggle') as HTMLInputElement;
    toggle.checked = currentSettings.includePinned;

    toggle.addEventListener('change', () => {
        currentSettings.includePinned = toggle.checked;
        void saveSettings(currentSettings);
    });
}

function renderShortcuts(): void {
    const list = getElement('shortcuts-list');
    list.innerHTML = '';

    for (const s of SHORTCUTS) {
        const row = document.createElement('div');
        row.className = 'shortcut-row';
        row.innerHTML = `<span>${browser.i18n.getMessage(s.labelKey) || s.labelKey}</span><kbd>${s.defaultKey}</kbd>`;
        list.appendChild(row);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    void init();
});
