import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  manifest: {
    name: 'TabsCopy',
    description: 'Copy tab information to clipboard in various formats',
    permissions: ['contextMenus', 'tabs', 'clipboardWrite', 'storage', 'commands'],
    commands: {
      'copy-current': {
        suggested_key: { default: 'Alt+Shift+C' },
        description: 'Copy current tab with default format',
      },
      'copy-window': {
        suggested_key: { default: 'Alt+Shift+A' },
        description: 'Copy current window tabs with default format',
      },
      'copy-all-windows': {
        suggested_key: { default: 'Alt+Shift+W' },
        description: 'Copy all windows tabs with default format',
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
