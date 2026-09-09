export function formatLocalDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

/**
 * Maps a storefront locale code to an Intl locale with a stable calendar and
 * numeral convention. Arabic renders in Gregorian (ar-EG, Arabic-Indic digits),
 * matching the existing customer-facing order surfaces. English and Hebrew map
 * to their own locales so English storefronts never get Arabic-only output.
 */
export function normalizeCustomerLocale(locale?: string | null): string {
    const raw = (locale || '').trim();
    if (!raw) return 'ar-EG';
    const lower = raw.toLowerCase();
    if (lower === 'ar' || lower.startsWith('ar')) return 'ar-EG';
    if (lower === 'he' || lower.startsWith('he')) return 'he';
    if (lower === 'en' || lower.startsWith('en')) return 'en-US';
    return raw;
}

export interface FormatCustomerDateOptions {
    locale?: string;
    withTime?: boolean;
    timeZone?: string;
}

/**
 * Customer-facing order date formatter. Converts raw UTC ISO timestamps sent by
 * the API into a localized, human-readable date (optionally with time). Invalid,
 * missing and empty values render a neutral em dash — never "Invalid Date" or the
 * raw ISO string. Stored timestamps are untouched; conversion is display-only.
 */
export function formatCustomerDate(value: string | number | Date | null | undefined, options: FormatCustomerDateOptions = {}): string {
    if (value === null || value === undefined || value === '') return '—';
    const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
    const locale = normalizeCustomerLocale(options.locale);
    try {
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...(options.withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
            ...(options.timeZone ? { timeZone: options.timeZone } : {}),
        }).format(date);
    } catch {
        return '—';
    }
}
