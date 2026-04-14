export async function writeToClipboard(text: string): Promise<void> {
  // Ensure offscreen document exists
  try {
    await (browser as any).offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Write tab info to clipboard',
    });
  } catch {
    // Already exists, that's fine
  }

  // Send clipboard write request to offscreen document
  const response = await browser.runtime.sendMessage({
    type: 'write-clipboard',
    text,
  });

  if (!response?.success) {
    throw new Error(response?.error || 'Clipboard write failed');
  }
}
