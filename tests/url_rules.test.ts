import { describe, expect, it } from 'vitest';
import { is_restricted_url } from '../lib/url_rules';

describe('is_restricted_url', () => {
    it.each([
        undefined,
        '',
        'chrome://extensions',
        'chrome-extension://abc/popup.html',
        'edge://extensions',
        'about:blank',
        'devtools://devtools/bundled/inspector.html',
        'view-source:https://example.com',
        'https://chrome.google.com/webstore/detail/example',
        'https://chromewebstore.google.com/detail/example',
        'moz-extension://abc/popup.html',
        'file:///tmp/example.html',
    ])('returns true for restricted url %s', (url) => {
        expect(is_restricted_url(url)).toBe(true);
    });

    it.each([
        'https://example.com',
        'http://localhost:3000',
    ])('returns false for injectable url %s', (url) => {
        expect(is_restricted_url(url)).toBe(false);
    });
});
