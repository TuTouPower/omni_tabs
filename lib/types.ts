export const FORMATS = [
    'url',
    'title_url_colon',
    'title_url_newline',
    'title',
    'markdown',
    'csv',
    'json',
    'html',
    'html_table',
] as const;

export type Format = (typeof FORMATS)[number];

const FORMAT_LABELS: Record<Format, string> = {
    url: 'URL',
    title_url_colon: 'Title: URL',
    title_url_newline: 'Title & URL',
    title: 'Title',
    markdown: 'Markdown',
    csv: 'CSV',
    json: 'JSON',
    html: 'HTML',
    html_table: 'HTML Table',
};

export const SCOPES = [
    'current',
    'window',
    'all_windows',
    'left',
    'right',
    'except_current',
] as const;

export type Scope = (typeof SCOPES)[number];

const SCOPE_LABELS: Record<Scope, string> = {
    current: 'Current Tab',
    window: 'Current Window',
    all_windows: 'All Windows',
    left: 'Tabs to the Left',
    right: 'Tabs to the Right',
    except_current: 'Except Current Tab',
};

export interface TabInfo {
    title: string;
    url: string;
}

export interface Settings {
    defaultFormat: Format;
    defaultScope: Scope;
    includePinned: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    defaultFormat: 'markdown',
    defaultScope: 'all_windows',
    includePinned: false,
};

/** Get i18n label for a format, falling back to FORMAT_LABELS. */
export function getFormatLabel(format: Format): string {
    return browser.i18n.getMessage(`fmt_${format}`) || FORMAT_LABELS[format];
}

/** Get i18n label for a scope, falling back to SCOPE_LABELS. */
export function getScopeLabel(scope: Scope): string {
    return browser.i18n.getMessage(`scope_${scope}`) || SCOPE_LABELS[scope];
}

/** Parse a 3rd-level menu ID like "tabscopy_markdown_current" into format + scope. */
export function parseMenuId(id: string): { format: Format; scope: Scope } | null {
    if (!id.startsWith('tabscopy_')) return null;
    const rest = id.slice('tabscopy_'.length);

    for (const scope of SCOPES) {
        if (rest.endsWith(`_${scope}`)) {
            const formatStr = rest.slice(0, rest.length - scope.length - 1);
            if ((FORMATS as readonly string[]).includes(formatStr)) {
                return { format: formatStr as Format, scope };
            }
        }
    }
    return null;
}

/** Build a 3rd-level menu ID from format and scope. */
export function buildMenuId(format: Format, scope: Scope): string {
    return `tabscopy_${format}_${scope}`;
}
