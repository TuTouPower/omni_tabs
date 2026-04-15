export async function writeToClipboard(text: string): Promise<void> {
    // Method 1: Direct API — works in popup, options page, Firefox background
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Service worker / no document context — fall through
        }
    }

    // Method 2: Offscreen Document (Chrome MV3 service worker)
    const offscreen = (browser as any).offscreen ?? (globalThis as any).chrome?.offscreen;
    if (offscreen) {
        const errors: string[] = [];
        try {
            const has_doc = offscreen.hasDocument ? await offscreen.hasDocument() : false;
            if (!has_doc) {
                await offscreen.createDocument({
                    url: 'offscreen.html',
                    reasons: ['CLIPBOARD'],
                    justification: 'Write tab info to clipboard from service worker',
                });
            }
        } catch (err) {
            errors.push(`createDocument: ${String(err)}`);
        }

        try {
            const response = await browser.runtime.sendMessage({
                target: 'offscreen',
                type: 'write-clipboard',
                text,
            });
            if (response?.success) return;
            errors.push(`offscreen response: ${response?.error ?? 'no response'}`);
        } catch (err) {
            errors.push(`sendMessage: ${String(err)}`);
        }

        // Fallback: inject into an http/https tab
        try {
            const all_tabs = await browser.tabs.query({});
            const target = all_tabs.find((t) =>
                t.id != null &&
                t.url != null &&
                (t.url.startsWith('http://') || t.url.startsWith('https://'))
            );
            if (target?.id) {
                await browser.scripting.executeScript({
                    target: { tabId: target.id },
                    func: (content: string) => navigator.clipboard.writeText(content),
                    args: [text],
                });
                return;
            }
            errors.push('no injectable tab');
        } catch (err) {
            errors.push(`injection: ${String(err)}`);
        }

        throw new Error(`Clipboard write failed: ${errors.join(' | ')}`);
    }

    throw new Error('Clipboard write failed: no method available');
}
