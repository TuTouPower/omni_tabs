import type { Format, TabInfo } from './types';

function escapeCsv(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeTitle(title: string): string {
  return title || 'Untitled';
}

type FormatterFn = (tabs: TabInfo[]) => string;

const formatters: Record<Format, FormatterFn> = {
  url: (tabs) => tabs.map((t) => t.url).join('\n'),
  title: (tabs) => tabs.map((t) => normalizeTitle(t.title)).join('\n'),
  title_url_colon: (tabs) =>
    tabs.map((t) => `${normalizeTitle(t.title)}: ${t.url}`).join('\n'),
  title_url_newline: (tabs) =>
    tabs.map((t) => `${normalizeTitle(t.title)}\n${t.url}`).join('\n\n'),
  markdown: (tabs) =>
    tabs.map((t) => `- [${normalizeTitle(t.title)}](${t.url})`).join('\n'),
  csv: (tabs) => {
    if (tabs.length === 0) return '';
    const header = '"title","url"';
    const rows = tabs.map(
      (t) => `${escapeCsv(normalizeTitle(t.title))},${escapeCsv(t.url)}`,
    );
    return [header, ...rows].join('\n');
  },
  json: (tabs) => {
    if (tabs.length === 0) return '';
    const data = tabs.map((t) => ({
      title: normalizeTitle(t.title),
      url: t.url,
    }));
    return JSON.stringify(data, null, 2);
  },
  html: (tabs) => {
    if (tabs.length === 0) return '';
    const items = tabs
      .map(
        (t) =>
          `  <li><a href="${escapeHtml(t.url)}">${escapeHtml(normalizeTitle(t.title))}</a></li>`,
      )
      .join('\n');
    return `<ul>\n${items}\n</ul>`;
  },
  html_table: (tabs) => {
    if (tabs.length === 0) return '';
    const rows = tabs
      .map(
        (t) =>
          `    <tr><td>${escapeHtml(normalizeTitle(t.title))}</td><td>${escapeHtml(t.url)}</td></tr>`,
      )
      .join('\n');
    return `<table>\n  <thead><tr><th>Title</th><th>URL</th></tr></thead>\n  <tbody>\n${rows}\n  </tbody>\n</table>`;
  },
};

export function formatTabs(format: Format, tabs: TabInfo[]): string {
  return formatters[format](tabs);
}
