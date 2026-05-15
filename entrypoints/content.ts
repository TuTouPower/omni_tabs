interface ResizeMessage {
    type: 'tabscopy-resize';
    height: number;
}

interface CloseMessage {
    type: 'tabscopy-close';
}

type PanelMessage = ResizeMessage | CloseMessage;

const EXTENSION_ORIGIN = browser.runtime.getURL('/').slice(0, -1);
const PANEL_WIDTH = 320;
const PANEL_OFFSET = 12;
const PANEL_Z_INDEX = 2147483647;

let panel: HTMLDivElement | null = null;
let iframe: HTMLIFrameElement | null = null;
let remove_click_listener: (() => void) | null = null;
let remove_key_listener: (() => void) | null = null;
let remove_message_listener: (() => void) | null = null;

function clamp_height(height: number): number {
    return Math.max(0, Math.min(height, window.innerHeight - PANEL_OFFSET * 2));
}

function is_panel_message(data: unknown): data is PanelMessage {
    if (!data || typeof data !== 'object') return false;

    const message = data as { type?: unknown; height?: unknown };
    if (message.type === 'tabscopy-close') return true;
    return message.type === 'tabscopy-resize' && typeof message.height === 'number';
}

function remove_panel(): void {
    remove_click_listener?.();
    remove_key_listener?.();
    remove_message_listener?.();
    panel?.remove();

    remove_click_listener = null;
    remove_key_listener = null;
    remove_message_listener = null;
    panel = null;
    iframe = null;
}

function attach_close_listeners(): void {
    const click_handler = (event: MouseEvent): void => {
        if (!panel || panel.contains(event.target as Node)) return;
        remove_panel();
    };

    const key_handler = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') remove_panel();
    };

    requestAnimationFrame(() => {
        document.addEventListener('click', click_handler, true);
        remove_click_listener = () => {
            document.removeEventListener('click', click_handler, true);
        };
    });

    document.addEventListener('keydown', key_handler);
    remove_key_listener = () => {
        document.removeEventListener('keydown', key_handler);
    };
}

function attach_message_listener(): void {
    const message_handler = (event: MessageEvent): void => {
        if (
            event.origin !== EXTENSION_ORIGIN ||
            event.source !== iframe?.contentWindow ||
            !is_panel_message(event.data)
        )
            return;

        if (event.data.type === 'tabscopy-close') {
            remove_panel();
            return;
        }

        iframe.style.height = `${String(clamp_height(event.data.height))}px`;
    };

    window.addEventListener('message', message_handler);
    remove_message_listener = () => {
        window.removeEventListener('message', message_handler);
    };
}

function create_panel(): void {
    if (panel) return;

    const next_panel = document.createElement('div');
    next_panel.dataset.tabscopyPanel = 'true';
    next_panel.style.position = 'fixed';
    next_panel.style.top = `${String(PANEL_OFFSET)}px`;
    next_panel.style.right = `${String(PANEL_OFFSET)}px`;
    next_panel.style.zIndex = String(PANEL_Z_INDEX);
    next_panel.style.borderRadius = '12px';
    next_panel.style.overflow = 'hidden';
    next_panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
    next_panel.style.width = `${String(PANEL_WIDTH)}px`;
    next_panel.style.maxHeight = `calc(100vh - ${String(PANEL_OFFSET * 2)}px)`;

    const next_iframe = document.createElement('iframe');
    next_iframe.src = browser.runtime.getURL('/popup.html');
    next_iframe.style.width = `${String(PANEL_WIDTH)}px`;
    next_iframe.style.height = '0';
    next_iframe.style.maxHeight = `calc(100vh - ${String(PANEL_OFFSET * 2)}px)`;
    next_iframe.style.border = 'none';
    next_iframe.style.display = 'block';

    next_panel.appendChild(next_iframe);
    document.documentElement.appendChild(next_panel);

    panel = next_panel;
    iframe = next_iframe;

    attach_close_listeners();
    attach_message_listener();
}

function is_extension_sender(sender: Browser.runtime.MessageSender): boolean {
    return sender.id === browser.runtime.id;
}

function is_toggle_panel_message(data: unknown): data is { type: 'tabscopy-toggle-panel' } {
    return Boolean(
        data &&
            typeof data === 'object' &&
            (data as { type?: unknown }).type === 'tabscopy-toggle-panel',
    );
}

function toggle_panel(): void {
    if (panel) {
        remove_panel();
        return;
    }

    create_panel();
}

export default defineContentScript({
    matches: ['<all_urls>'],
    runAt: 'document_idle',
    main() {
        browser.runtime.onMessage.addListener((message: unknown, sender) => {
            if (!is_extension_sender(sender) || !is_toggle_panel_message(message)) return false;
            toggle_panel();
            return false;
        });
    },
});
