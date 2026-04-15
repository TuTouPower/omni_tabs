import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['contextMenus', 'tabs', 'clipboardWrite', 'storage', 'commands', 'scripting', 'offscreen'],
    commands: {
      'copy-current': {
        suggested_key: { default: 'Alt+Shift+C' },
        description: '__MSG_cmdCopyCurrent__',
      },
      'copy-window': {
        suggested_key: { default: 'Alt+Shift+A' },
        description: '__MSG_cmdCopyWindow__',
      },
      'copy-all-windows': {
        suggested_key: { default: 'Alt+Shift+W' },
        description: '__MSG_cmdCopyAllWindows__',
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
