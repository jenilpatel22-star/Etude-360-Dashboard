const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

export const formatCurrency = (v: number) => gbp.format(v);
export const formatCompactCurrency = (v: number) => `£${compact.format(v)}`;
export const formatPct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
export const formatScore = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');
export const formatNumber = (v: number) => new Intl.NumberFormat('en-GB').format(v);
export const formatNps = (v: number) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${Math.round(v)}` : '—');

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
