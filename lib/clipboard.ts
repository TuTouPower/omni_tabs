export async function writeToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (clipboardText: string) => navigator.clipboard.writeText(clipboardText),
      args: [text],
    });
  }
}
