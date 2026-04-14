// Offscreen document for clipboard access in MV3 service worker
// The background service worker cannot access clipboard directly,
// so it delegates to this offscreen document via messaging.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'write-clipboard') {
    navigator.clipboard.writeText(msg.text).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // keep channel open for async response
  }
});
