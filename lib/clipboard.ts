export async function writeToClipboard(text: string): Promise<void> {
  // Use content script injection with execCommand - most reliable across MV2/MV3
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');

  await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: (clipboardText: string) => {
      const textarea = document.createElement('textarea');
      textarea.value = clipboardText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    },
    args: [text],
  });
}
