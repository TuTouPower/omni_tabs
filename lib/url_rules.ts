const RESTRICTED_URL_PREFIXES = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'devtools://',
    'view-source:',
    'moz-extension://',
    'file://',
    'https://chrome.google.com/webstore',
    'https://chromewebstore.google.com',
];

export function is_restricted_url(url: string | undefined): boolean {
    if (!url) return true;

    return RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}
