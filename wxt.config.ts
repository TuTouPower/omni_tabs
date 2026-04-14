import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  manifest: {
    name: 'TabsCopy',
    description: 'Copy tab information to clipboard in various formats',
    permissions: ['contextMenus', 'tabs', 'clipboardWrite', 'storage', 'commands'],
  },
});
