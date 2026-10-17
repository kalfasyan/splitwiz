// Spending summaries for the Stats tab. Pure functions over the expenses
// already loaded, so they are easy to test and need no extra API.

import type { Expense } from './pb';

export type RangeId = 'this-month' | 'last-month' | '3-months' | 'this-year' | '12-months' | 'all';

export const ranges: { id: RangeId; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: '3-months', label: '3 months' },
  { id: 'this-year', label: 'This year' },
  { id: '12-months', label: '12 months' },
  { id: 'all', label: 'All time' },
];

/** First and last day (inclusive, YYYY-MM-DD) of a range, relative to `today`. */
export function rangeBounds(id: RangeId, today: string, expenses: Expense[]): { from: string; to: string } {
  const [y, m] = today.split('-').map(Number);
  const month = (yy: number, mm: number) => {
    const d = new Date(Date.UTC(yy, mm - 1, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const lastDay = (ym: string) => {
    const [yy, mm] = ym.split('-').map(Number);
    return `${ym}-${String(new Date(Date.UTC(yy, mm, 0)).getUTCDate()).padStart(2, '0')}`;
  };

  switch (id) {
    case 'this-month':
      return { from: `${month(y, m)}-01`, to: today };
    case 'last-month': {
      const ym = month(y, m - 1);
      return { from: `${ym}-01`, to: lastDay(ym) };
    }
    case '3-months':
      return { from: `${month(y, m - 2)}-01`, to: today };
    case 'this-year':
      return { from: `${y}-01-01`, to: today };
    case '12-months':
      return { from: `${month(y, m - 11)}-01`, to: today };
    case 'all': {
      const first = expenses.reduce((min, e) => (e.date < min ? e.date : min), today);
      return { from: first.slice(0, 10), to: today };
    }
  }
}

export function inRange(expenses: Expense[], from: string, to: string): Expense[] {
  return expenses.filter((e) => {
    const d = e.date.slice(0, 10);
    return d >= from && d <= to;
  });
}

export type CategoryTotal = { category: string; cents: number; count: number; share: number };

/** Totals per category id ('' = no category), largest first. */
export function byCategory(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<string, { cents: number; count: number }>();
  let all = 0;
  for (const e of expenses) {
    const t = totals.get(e.category) ?? { cents: 0, count: 0 };
    t.cents += e.amount_cents;
    t.count++;
    totals.set(e.category, t);
    all += e.amount_cents;
  }
  return [...totals]
    .map(([category, t]) => ({ category, ...t, share: all ? t.cents / all : 0 }))
    .sort((a, b) => b.cents - a.cents);
}

export type Period = { key: string; label: string; cents: number };

/**
 * Totals per month across the whole range, empty months included. Ranges
 * longer than two years are grouped per year so the bars stay readable.
 */
export function byPeriod(expenses: Expense[], from: string, to: string): Period[] {
  const months: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const end = to.slice(0, 7);
  while (true) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (key > end) break;
    months.push(key);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }

  const yearly = months.length > 24;
  const keys = yearly ? [...new Set(months.map((k) => k.slice(0, 4)))] : months;
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const e of expenses) {
    const k = yearly ? e.date.slice(0, 4) : e.date.slice(0, 7);
    if (totals.has(k)) totals.set(k, totals.get(k)! + e.amount_cents);
  }

  return keys.map((key) => ({
    key,
    label: yearly
      ? key
      : new Date(key + '-15T12:00:00').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
    cents: totals.get(key)!,
  }));
}

/** Who paid how much in total, by user id. */
export function paidBy(expenses: Expense[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of expenses) out[e.paid_by] = (out[e.paid_by] ?? 0) + e.amount_cents;
  return out;
}

/** Number of calendar months the range touches, for "per month" averages. */
export function monthsIn(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
}

/** Round axis maximum and three tick values (0, half, max). */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * exp).find((s) => s * 2 >= max)!;
  return [0, step, step * 2];
}
