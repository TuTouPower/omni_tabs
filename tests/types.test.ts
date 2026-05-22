import { describe, expect, it } from 'vitest';
import { buildMenuId, parseMenuId } from '../lib/types';

describe('parseMenuId', () => {
    it('parses a valid leaf menu ID', () => {
        expect(parseMenuId('omni_tabs_markdown_current')).toEqual({
            format: 'markdown',
            scope: 'current',
        });
    });

    it('parses format with underscores', () => {
        expect(parseMenuId('omni_tabs_title_url_colon_window')).toEqual({
            format: 'title_url_colon',
            scope: 'window',
        });
    });

    it('parses html_table format', () => {
        expect(parseMenuId('omni_tabs_html_table_left')).toEqual({
            format: 'html_table',
            scope: 'left',
        });
    });

    it('returns null for parent menu ID (no scope)', () => {
        expect(parseMenuId('omni_tabs_markdown')).toBeNull();
    });

    it('returns null for root menu ID', () => {
        expect(parseMenuId('omni_tabs')).toBeNull();
    });

    it('returns null for unrelated ID', () => {
        expect(parseMenuId('some_other_id')).toBeNull();
    });
});

describe('buildMenuId', () => {
    it('builds a menu ID from format and scope', () => {
        expect(buildMenuId('csv', 'all_windows')).toBe('omni_tabs_csv_all_windows');
    });

    it('round-trips with parseMenuId', () => {
        const id = buildMenuId('html_table', 'except_current');
        expect(parseMenuId(id)).toEqual({
            format: 'html_table',
            scope: 'except_current',
        });
    });
});
