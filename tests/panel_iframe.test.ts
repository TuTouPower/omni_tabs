import { describe, expect, it } from 'vitest';
import {
    clamp_height,
    get_panel_config,
    is_panel_message,
    PANEL_ATTR,
    PANEL_OFFSET,
    PANEL_WIDTH,
    PANEL_Z_INDEX,
    type PanelMessage,
} from '../lib/panel_iframe';

describe('clamp_height', () => {
    it('returns height when within viewport', () => {
        expect(clamp_height(400, 800)).toBe(400);
    });

    it('clamps to viewport minus offset', () => {
        expect(clamp_height(900, 800)).toBe(800 - PANEL_OFFSET * 2);
    });

    it('returns 0 for negative input', () => {
        expect(clamp_height(-100, 800)).toBe(0);
    });

    it('returns 0 when viewport is smaller than offset', () => {
        expect(clamp_height(100, 20)).toBe(0);
    });
});

describe('is_panel_message', () => {
    it('accepts resize message with valid height', () => {
        const msg: PanelMessage = { type: 'omni_tabs-resize', height: 300 };
        expect(is_panel_message(msg)).toBe(true);
    });

    it('accepts close message', () => {
        const msg: PanelMessage = { type: 'omni_tabs-close' };
        expect(is_panel_message(msg)).toBe(true);
    });

    it('rejects resize message without height', () => {
        expect(is_panel_message({ type: 'omni_tabs-resize' })).toBe(false);
    });

    it('rejects resize message with non-number height', () => {
        expect(is_panel_message({ type: 'omni_tabs-resize', height: '300' })).toBe(false);
    });

    it('rejects unknown message type', () => {
        expect(is_panel_message({ type: 'unknown' })).toBe(false);
    });

    it('rejects null/undefined', () => {
        expect(is_panel_message(null)).toBe(false);
        expect(is_panel_message(undefined)).toBe(false);
    });

    it('rejects non-object', () => {
        expect(is_panel_message('string')).toBe(false);
        expect(is_panel_message(42)).toBe(false);
    });
});

describe('get_panel_config', () => {
    const mock_get_url = (path: string) => `chrome-extension://abc${path}`;

    it('returns popup_src pointing to popup.html', () => {
        const config = get_panel_config(mock_get_url);
        expect(config.popup_src).toBe('chrome-extension://abc/popup.html');
    });

    it('allow attribute includes clipboard-write', () => {
        const config = get_panel_config(mock_get_url);
        expect(config.allow_attr).toContain('clipboard-write');
    });

    it('dataset attribute is omniTabsPanel', () => {
        const config = get_panel_config(mock_get_url);
        expect(config.dataset_attr).toBe(PANEL_ATTR);
    });

    it('uses fixed positioning values (offset, z_index, width)', () => {
        const config = get_panel_config(mock_get_url);
        expect(config.width).toBe(PANEL_WIDTH);
        expect(config.offset).toBe(PANEL_OFFSET);
        expect(config.z_index).toBe(PANEL_Z_INDEX);
    });

    it('has border radius', () => {
        const config = get_panel_config(mock_get_url);
        expect(config.border_radius).toBe('12px');
    });
});
