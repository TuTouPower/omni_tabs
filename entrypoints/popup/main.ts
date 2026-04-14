import { FORMATS, SCOPES, FORMAT_LABELS, SCOPE_LABELS, getFormatLabel, getScopeLabel } from '../../lib/types';
import type { Format, Scope, Settings } from '../../lib/types';
import { loadSettings, saveSettings } from '../../lib/storage';
import { DEFAULT_SETTINGS } from '../../lib/types';

const SHORTCUTS: { command: string; labelKey: string; defaultKey: string }[] = [
  { command: 'copy-current', labelKey: 'shortcutCopyCurrent', defaultKey: 'Alt+Shift+C' },
  { command: 'copy-window', labelKey: 'shortcutCopyWindow', defaultKey: 'Alt+Shift+A' },
  { command: 'copy-all-windows', labelKey: 'shortcutCopyAllWindows', defaultKey: 'Alt+Shift+W' },
];

let currentSettings: Settings = { ...DEFAULT_SETTINGS };

async function init(): Promise<void> {
  document.getElementById('subtitle')!.textContent = browser.i18n.getMessage('popupSubtitle') || 'Smart Tab Copier';
  document.getElementById('label-format')!.textContent = browser.i18n.getMessage('settingDefaultFormat') || 'Default Format';
  document.getElementById('label-scope')!.textContent = browser.i18n.getMessage('settingDefaultScope') || 'Default Scope';
  document.getElementById('label-pinned')!.textContent = browser.i18n.getMessage('settingIncludePinned') || 'Include Pinned Tabs';
  document.getElementById('desc-pinned')!.textContent = browser.i18n.getMessage('settingIncludePinnedDesc') || 'Default: exclude pinned tabs';
  document.getElementById('label-shortcuts')!.textContent = browser.i18n.getMessage('shortcutsTitle') || 'Shortcuts';
  document.getElementById('hint-shortcuts')!.textContent = browser.i18n.getMessage('shortcutsHint') || 'Customize in browser extension settings';

  // Copy button
  const copyBtn = document.getElementById('copy-btn')! as HTMLButtonElement;
  copyBtn.textContent = browser.i18n.getMessage('copyButton') || 'Copy Now';
  copyBtn.addEventListener('click', handleCopy);

  // Configure shortcuts button
  const configBtn = document.getElementById('configure-shortcuts-btn')!;
  configBtn.textContent = browser.i18n.getMessage('configureShortcuts') || 'Configure Shortcuts';
  configBtn.addEventListener('click', () => {
    browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  currentSettings = await loadSettings();
  renderFormatChips();
  renderScopeSelect();
  renderPinnedToggle();
  renderShortcuts();
}

async function handleCopy(): Promise<void> {
  const copyBtn = document.getElementById('copy-btn')! as HTMLButtonElement;
  const status = document.getElementById('copy-status')!;

  copyBtn.disabled = true;

  try {
    const response = await browser.runtime.sendMessage({
      type: 'copyWithSettings',
      settings: currentSettings,
    });

    if (response?.success) {
      copyBtn.classList.add('copied');
      copyBtn.textContent = browser.i18n.getMessage('copyButtonDone') || 'Copied!';
      status.textContent = `${response.count} ${browser.i18n.getMessage('tabsCopied') || 'tabs copied'}`;

      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.textContent = browser.i18n.getMessage('copyButton') || 'Copy Now';
        status.textContent = '';
      }, 2000);
    } else {
      status.textContent = response?.error || 'Failed';
      status.style.color = '#f85149';
    }
  } catch (err) {
    status.textContent = String(err);
    status.style.color = '#f85149';
  } finally {
    copyBtn.disabled = false;
  }
}

function renderFormatChips(): void {
  const container = document.getElementById('format-chips')!;
  container.innerHTML = '';

  for (const format of FORMATS) {
    const chip = document.createElement('span');
    chip.className = 'chip' + (format === currentSettings.defaultFormat ? ' active' : '');
    chip.textContent = getFormatLabel(format);
    chip.addEventListener('click', () => {
      currentSettings.defaultFormat = format;
      saveSettings(currentSettings);
      renderFormatChips();
    });
    container.appendChild(chip);
  }
}

function renderScopeSelect(): void {
  const select = document.getElementById('scope-select')! as HTMLSelectElement;
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
    saveSettings(currentSettings);
  });
}

function renderPinnedToggle(): void {
  const toggle = document.getElementById('pinned-toggle')! as HTMLInputElement;
  toggle.checked = currentSettings.includePinned;

  toggle.addEventListener('change', () => {
    currentSettings.includePinned = toggle.checked;
    saveSettings(currentSettings);
  });
}

function renderShortcuts(): void {
  const list = document.getElementById('shortcuts-list')!;
  list.innerHTML = '';

  for (const s of SHORTCUTS) {
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    row.innerHTML = `<span>${browser.i18n.getMessage(s.labelKey) || s.labelKey}</span><kbd>${s.defaultKey}</kbd>`;
    list.appendChild(row);
  }
}

document.addEventListener('DOMContentLoaded', init);
