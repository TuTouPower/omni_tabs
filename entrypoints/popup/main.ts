import { FORMATS, SCOPES, FORMAT_LABELS, SCOPE_LABELS } from '../../lib/types';
import type { Format, Scope, Settings } from '../../lib/types';
import { loadSettings, saveSettings } from '../../lib/storage';
import { DEFAULT_SETTINGS } from '../../lib/types';

const SHORTCUTS: { command: string; label: string; defaultKey: string }[] = [
  { command: 'copy-current', label: 'Copy Current Tab', defaultKey: 'Alt+Shift+C' },
  { command: 'copy-window', label: 'Copy Current Window', defaultKey: 'Alt+Shift+A' },
  { command: 'copy-all-windows', label: 'Copy All Windows', defaultKey: 'Alt+Shift+W' },
];

let currentSettings: Settings = { ...DEFAULT_SETTINGS };

async function init(): Promise<void> {
  currentSettings = await loadSettings();
  renderFormatChips();
  renderScopeSelect();
  renderPinnedToggle();
  renderShortcuts();
}

function renderFormatChips(): void {
  const container = document.getElementById('format-chips')!;
  container.innerHTML = '';

  for (const format of FORMATS) {
    const chip = document.createElement('span');
    chip.className = 'chip' + (format === currentSettings.defaultFormat ? ' active' : '');
    chip.textContent = FORMAT_LABELS[format];
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
    option.textContent = SCOPE_LABELS[scope];
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
    row.innerHTML = `<span>${s.label}</span><kbd>${s.defaultKey}</kbd>`;
    list.appendChild(row);
  }
}

document.addEventListener('DOMContentLoaded', init);
