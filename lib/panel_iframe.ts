export const PANEL_WIDTH = 320;
export const PANEL_OFFSET = 12;
export const PANEL_Z_INDEX = 2147483647;
export const PANEL_ATTR = 'omniTabsPanel';

export interface ResizeMessage {
    type: 'omni_tabs-resize';
    height: number;
}

export interface CloseMessage {
    type: 'omni_tabs-close';
}

export type PanelMessage = ResizeMessage | CloseMessage;

export function clamp_height(height: number, viewport_height: number): number {
    return Math.max(0, Math.min(height, viewport_height - PANEL_OFFSET * 2));
}

export function is_panel_message(data: unknown): data is PanelMessage {
    if (!data || typeof data !== 'object') return false;

    const message = data as { type?: unknown; height?: unknown };
    if (message.type === 'omni_tabs-close') return true;
    return message.type === 'omni_tabs-resize' && typeof message.height === 'number';
}

export interface PanelConfig {
    popup_src: string;
    width: number;
    offset: number;
    z_index: number;
    border_radius: string;
    allow_attr: string;
    dataset_attr: string;
}

export function get_panel_config(get_popup_url: (path: string) => string): PanelConfig {
    return {
        popup_src: get_popup_url('/popup.html'),
        width: PANEL_WIDTH,
        offset: PANEL_OFFSET,
        z_index: PANEL_Z_INDEX,
        border_radius: '12px',
        allow_attr: 'clipboard-write',
        dataset_attr: PANEL_ATTR,
    };
}
