// Turning existing expenses into repeating ones, and spotting expenses that
// already repeat (imported history carries no repeat information).

import type { Every, Expense, Recurring } from './pb';

/**
 * Same rule as the server's ledger.NextDate: monthly/yearly stay on
 * `anchorDay` (default: the day of `day`), clamped to short months.
 */
export function nextDate(day: string, every: Every, anchorDay = 0): string {
  const [y, m, d] = day.split('-').map(Number);
  const fmt = (yy: number, mm: number, dd: number) =>
    `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  if (every === 'week') {
    const t = new Date(Date.UTC(y, m - 1, d + 7));
    return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  const [ny, nm] = every === 'month' ? (m === 12 ? [y + 1, 1] : [y, m + 1]) : [y + 1, m];
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return fmt(ny, nm, Math.min(anchorDay >= 1 && anchorDay <= 31 ? anchorDay : d, last));
}

export type Occurrence = { series: Recurring; day: string };

/**
 * Dates the active series will add an expense on, from `from` to `to`
 * (inclusive, YYYY-MM-DD), soonest first.
 */
export function upcoming(series: Recurring[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const s of series) {
    if (s.paused) continue;
    let day = s.next_date.slice(0, 10);
    for (let i = 0; i < 400 && day <= to; i++) {
      if (day >= from) out.push({ series: s, day });
      day = nextDate(day, s.every, s.anchor_day);
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || b.series.amount_cents - a.series.amount_cents);
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Expenses that are "the same charge": same text, amount, payer and split. */
export function sameCharge(a: Expense, b: Expense): boolean {
  return (
    norm(a.description) === norm(b.description) &&
    a.amount_cents === b.amount_cents &&
    a.paid_by === b.paid_by &&
    a.split_mode === b.split_mode &&
    a.owed_cents === b.owed_cents
  );
}

export type Suggestion = { latest: Expense; matches: Expense[] };

const monthIndex = (day: string) => Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7));
const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

/**
 * Charges that came back in each of the last three months on about the
 * same day, most recently within ~6 weeks, and that aren't a series yet.
 */
export function suggestMonthly(expenses: Expense[], series: Recurring[], today: string): Suggestion[] {
  const taken = new Set(series.map((s) => norm(s.description)));
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (e.recurring || taken.has(norm(e.description))) continue;
    const key = [norm(e.description), e.amount_cents, e.paid_by, e.split_mode, e.owed_cents].join('|');
    const g = groups.get(key);
    if (g) g.push(e);
    else groups.set(key, [e]);
  }

  const out: Suggestion[] = [];
  for (const g of groups.values()) {
    if (g.length < 3) continue;
    const days = g.map((e) => e.date.slice(0, 10)).sort();
    const [a, b, c] = days.slice(-3);
    const consecutive = monthIndex(b) - monthIndex(a) === 1 && monthIndex(c) - monthIndex(b) === 1;
    const sameDay = Math.max(...[a, b, c].map((d) => Number(d.slice(8)))) - Math.min(...[a, b, c].map((d) => Number(d.slice(8)))) <= 5;
    if (!consecutive || !sameDay || daysBetween(c, today) > 45) continue;
    const latest = g.reduce((x, y) => (y.date > x.date ? y : x));
    out.push({ latest, matches: g });
  }
  return out.sort((x, y) => y.latest.amount_cents - x.latest.amount_cents);
}
