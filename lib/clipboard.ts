interface OffscreenAPI {
    hasDocument?: () => Promise<boolean>;
    createDocument: (options: {
        url: string;
        reasons: string[];
        justification: string;
    }) => Promise<void>;
}

interface SuccessResponse {
    success: true;
}

interface ErrorResponse {
    error: string;
}

function isSuccessResponse(value: unknown): value is SuccessResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        'success' in value &&
        (value as SuccessResponse).success
    );
}

function isErrorResponse(value: unknown): value is ErrorResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        'error' in value &&
        typeof (value as ErrorResponse).error === 'string'
    );
}

export async function writeToClipboard(text: string): Promise<void> {
    // Method 1: Direct API — works in popup, options page, Firefox background
    try {
        await navigator.clipboard.writeText(text);
        return;
    } catch {
        // Service worker / no document context — fall through
    }

    // Method 2: Offscreen Document (Chrome MV3 service worker)
    const chromeObj = (globalThis as unknown as Record<string, Record<string, unknown>>).chrome;
    const offscreen = chromeObj?.offscreen as OffscreenAPI | undefined;
    if (offscreen) {
        const errors: string[] = [];
        try {
            const hasDoc = offscreen.hasDocument ? await offscreen.hasDocument() : false;
            if (!hasDoc) {
                await offscreen.createDocument({
                    url: 'offscreen.html',
                    reasons: ['CLIPBOARD'],
                    justification: 'Write tab info to clipboard from service worker',
                });
            }
        } catch (err: unknown) {
            errors.push(`createDocument: ${String(err)}`);
        }

        try {
            const response: unknown = await browser.runtime.sendMessage({
                target: 'offscreen',
                type: 'write-clipboard',
                text,
            });
            if (isSuccessResponse(response)) return;
            const errMsg = isErrorResponse(response) ? response.error : 'no response';
            errors.push(`offscreen response: ${errMsg}`);
        } catch (err: unknown) {
            errors.push(`sendMessage: ${String(err)}`);
        }

        // Fallback: inject into an http/https tab
        try {
            const allTabs = await browser.tabs.query({});
            const target = allTabs.find(
                (t: Browser.tabs.Tab) =>
                    t.id != null &&
                    t.url != null &&
                    (t.url.startsWith('http://') || t.url.startsWith('https://')),
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
        } catch (err: unknown) {
            errors.push(`injection: ${String(err)}`);
        }

        throw new Error(`Clipboard write failed: ${errors.join(' | ')}`);
    }

    throw new Error('Clipboard write failed: no method available');
}
