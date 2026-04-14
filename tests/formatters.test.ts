import { describe, it, expect } from 'vitest';
import { formatTabs } from '../lib/formatters';
import type { TabInfo } from '../lib/types';

const TABS: TabInfo[] = [
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'Google', url: 'https://google.com' },
  { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
];

const SINGLE_TAB: TabInfo[] = [
  { title: 'Hello', url: 'https://example.com' },
];

const EMPTY_TITLE_TAB: TabInfo[] = [
  { title: '', url: 'https://example.com' },
];

const SPECIAL_CHARS_TAB: TabInfo[] = [
  { title: 'He said "hello"', url: 'https://example.com?a=1&b=2' },
];

describe('formatTabs', () => {
  describe('url format', () => {
    it('formats multiple tabs as one URL per line', () => {
      expect(formatTabs('url', TABS)).toBe(
        'https://github.com\nhttps://google.com\nhttps://stackoverflow.com',
      );
    });
    it('formats single tab', () => {
      expect(formatTabs('url', SINGLE_TAB)).toBe('https://example.com');
    });
  });

  describe('title format', () => {
    it('formats multiple tabs as one title per line', () => {
      expect(formatTabs('title', TABS)).toBe('GitHub\nGoogle\nStack Overflow');
    });
    it('uses Untitled for empty title', () => {
      expect(formatTabs('title', EMPTY_TITLE_TAB)).toBe('Untitled');
    });
  });

  describe('title_url_colon format', () => {
    it('formats as Title: URL per line', () => {
      expect(formatTabs('title_url_colon', TABS)).toBe(
        'GitHub: https://github.com\nGoogle: https://google.com\nStack Overflow: https://stackoverflow.com',
      );
    });
  });

  describe('title_url_newline format', () => {
    it('formats as title and URL on separate lines with blank line between', () => {
      expect(formatTabs('title_url_newline', TABS)).toBe(
        'GitHub\nhttps://github.com\n\nGoogle\nhttps://google.com\n\nStack Overflow\nhttps://stackoverflow.com',
      );
    });
    it('formats single tab without trailing newline', () => {
      expect(formatTabs('title_url_newline', SINGLE_TAB)).toBe('Hello\nhttps://example.com');
    });
  });

  describe('markdown format', () => {
    it('formats as markdown link list', () => {
      expect(formatTabs('markdown', TABS)).toBe(
        '- [GitHub](https://github.com)\n- [Google](https://google.com)\n- [Stack Overflow](https://stackoverflow.com)',
      );
    });
  });

  describe('csv format', () => {
    it('formats as CSV with header row', () => {
      expect(formatTabs('csv', TABS)).toBe(
        '"title","url"\n"GitHub","https://github.com"\n"Google","https://google.com"\n"Stack Overflow","https://stackoverflow.com"',
      );
    });
    it('escapes quotes in values', () => {
      expect(formatTabs('csv', SPECIAL_CHARS_TAB)).toBe(
        '"title","url"\n"He said ""hello""","https://example.com?a=1&b=2"',
      );
    });
  });

  describe('json format', () => {
    it('formats as JSON array of objects', () => {
      const result = formatTabs('json', TABS);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual([
        { title: 'GitHub', url: 'https://github.com' },
        { title: 'Google', url: 'https://google.com' },
        { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
      ]);
    });
    it('is pretty-printed with 2-space indent', () => {
      const result = formatTabs('json', SINGLE_TAB);
      expect(result).toContain('\n  ');
    });
  });

  describe('html format', () => {
    it('formats as unordered list with links', () => {
      expect(formatTabs('html', TABS)).toBe(
        '<ul>\n  <li><a href="https://github.com">GitHub</a></li>\n  <li><a href="https://google.com">Google</a></li>\n  <li><a href="https://stackoverflow.com">Stack Overflow</a></li>\n</ul>',
      );
    });
    it('escapes HTML in titles and URLs', () => {
      const result = formatTabs('html', [{ title: 'A<B>&"C"', url: 'https://x.com/<path>' }]);
      expect(result).toContain('A&lt;B&gt;&amp;&quot;C&quot;');
      expect(result).toContain('https://x.com/&lt;path&gt;');
    });
  });

  describe('html_table format', () => {
    it('formats as HTML table with header', () => {
      expect(formatTabs('html_table', TABS)).toBe(
        '<table>\n  <thead><tr><th>Title</th><th>URL</th></tr></thead>\n  <tbody>\n    <tr><td>GitHub</td><td>https://github.com</td></tr>\n    <tr><td>Google</td><td>https://google.com</td></tr>\n    <tr><td>Stack Overflow</td><td>https://stackoverflow.com</td></tr>\n  </tbody>\n</table>',
      );
    });
    it('escapes HTML in cell values', () => {
      const result = formatTabs('html_table', [{ title: '<script>', url: 'https://x.com/?a=b&c=d' }]);
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('https://x.com/?a=b&amp;c=d');
    });
  });

  describe('empty input', () => {
    it('returns empty string for all formats with empty array', () => {
      const formats = ['url', 'title', 'title_url_colon', 'title_url_newline', 'markdown', 'csv', 'json', 'html', 'html_table'] as const;
      for (const fmt of formats) {
        expect(formatTabs(fmt, [])).toBe('');
      }
    });
  });
});
