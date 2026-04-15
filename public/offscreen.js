// Offscreen document for clipboard access in MV3 service worker.
// Uses textarea + execCommand('copy') which works without document focus,
// unlike navigator.clipboard.writeText which requires focus.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.target !== 'offscreen' || msg.type !== 'write-clipboard') {
        return;
    }
    try {
        const textarea = document.getElementById('clipboard-textarea');
        textarea.value = msg.text;
        textarea.select();
        const ok = document.execCommand('copy');
        if (ok) {
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'execCommand returned false' });
        }
    } catch (err) {
        sendResponse({ success: false, error: String(err) });
    }
    return true;
});
