export interface TogglePanelMessage {
    type: 'omni_tabs-toggle-panel';
}

export interface PanelMessagingDeps {
    send_message: (tab_id: number, message: TogglePanelMessage) => Promise<void>;
    inject_content_script: (tab_id: number) => Promise<void>;
    set_badge: (text: string) => Promise<void>;
    clear_badge: () => void;
}

export async function send_toggle_panel_message(
    deps: PanelMessagingDeps,
    tab_id: number,
    message: TogglePanelMessage,
): Promise<void> {
    try {
        await deps.send_message(tab_id, message);
    } catch {
        await deps.inject_content_script(tab_id);
        await deps.send_message(tab_id, message);
    }
}

export async function notify_panel_failure(deps: PanelMessagingDeps): Promise<void> {
    await deps.set_badge('!');
    deps.clear_badge();
}

export function create_browser_panel_deps(): PanelMessagingDeps {
    return {
        send_message: (tab_id, message) => browser.tabs.sendMessage(tab_id, message),
        inject_content_script: (tab_id) =>
            browser.scripting
                .executeScript({
                    target: { tabId: tab_id },
                    files: ['/content-scripts/content.js'],
                })
                .then(() => undefined),
        set_badge: (text) => browser.action.setBadgeText({ text }),
        clear_badge: () => {
            setTimeout(() => {
                void browser.action.setBadgeText({ text: '' });
            }, 3000);
        },
    };
}
