import { describe, it, expect } from 'vitest';
import { filterTabs, getTabQuery } from '../lib/tab_scopes';
import type { Scope } from '../lib/types';

interface MockTab {
  id: number;
  title: string;
  url: string;
  index: number;
  active: boolean;
  pinned: boolean;
}

const WINDOW_TABS: MockTab[] = [
  { id: 1, title: 'GitHub', url: 'https://github.com', index: 0, active: false, pinned: true },
  { id: 2, title: 'Google', url: 'https://google.com', index: 1, active: false, pinned: false },
  { id: 3, title: 'Stack Overflow', url: 'https://stackoverflow.com', index: 2, active: true, pinned: false },
  { id: 4, title: 'Reddit', url: 'https://reddit.com', index: 3, active: false, pinned: false },
  { id: 5, title: 'Hacker News', url: 'https://news.ycombinator.com', index: 4, active: false, pinned: false },
];

describe('getTabQuery', () => {
  it('returns query for current tab', () => {
    expect(getTabQuery('current')).toEqual({ active: true, currentWindow: true });
  });
  it('returns query for current window', () => {
    expect(getTabQuery('window')).toEqual({ currentWindow: true });
  });
  it('returns query for all windows', () => {
    expect(getTabQuery('all_windows')).toEqual({});
  });
  it('returns query for left', () => {
    expect(getTabQuery('left')).toEqual({ currentWindow: true });
  });
  it('returns query for right', () => {
    expect(getTabQuery('right')).toEqual({ currentWindow: true });
  });
  it('returns query for except current', () => {
    expect(getTabQuery('except_current')).toEqual({ currentWindow: true });
  });
});

describe('filterTabs', () => {
  it('current: returns only active tab', () => {
    const result = filterTabs(WINDOW_TABS, 'current', false);
    expect(result).toEqual([{ title: 'Stack Overflow', url: 'https://stackoverflow.com' }]);
  });

  it('window: returns all non-pinned tabs', () => {
    const result = filterTabs(WINDOW_TABS, 'window', false);
    expect(result).toHaveLength(4);
    expect(result.map((t) => t.title)).toEqual(['Google', 'Stack Overflow', 'Reddit', 'Hacker News']);
  });

  it('window: includes pinned tabs when includePinned is true', () => {
    const result = filterTabs(WINDOW_TABS, 'window', true);
    expect(result).toHaveLength(5);
    expect(result[0].title).toBe('GitHub');
  });

  it('all_windows: same as window for single-window set', () => {
    const result = filterTabs(WINDOW_TABS, 'all_windows', false);
    expect(result).toHaveLength(4);
  });

  it('left: returns tabs left of active tab', () => {
    const result = filterTabs(WINDOW_TABS, 'left', false);
    expect(result).toEqual([{ title: 'Google', url: 'https://google.com' }]);
  });

  it('right: returns tabs right of active tab', () => {
    const result = filterTabs(WINDOW_TABS, 'right', false);
    expect(result.map((t) => t.title)).toEqual(['Reddit', 'Hacker News']);
  });

  it('except_current: returns all non-active, non-pinned tabs', () => {
    const result = filterTabs(WINDOW_TABS, 'except_current', false);
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.title)).toEqual(['Google', 'Reddit', 'Hacker News']);
  });

  it('returns empty array when no tabs match', () => {
    const tabsWithActiveFirst = WINDOW_TABS.map((t) => ({ ...t, active: t.index === 0 }));
    const result = filterTabs(tabsWithActiveFirst, 'left', false);
    expect(result).toEqual([]);
  });

  it('handles tab with missing title by using Untitled', () => {
    const tabs = [
      { id: 1, title: '', url: 'https://example.com', index: 0, active: true, pinned: false },
    ];
    const result = filterTabs(tabs, 'current', false);
    expect(result[0].title).toBe('Untitled');
  });

  it('handles tab with missing url by using empty string', () => {
    const tabs = [
      { id: 1, title: 'Test', url: '', index: 0, active: true, pinned: false },
    ];
    const result = filterTabs(tabs, 'current', false);
    expect(result[0].url).toBe('');
  });
});
