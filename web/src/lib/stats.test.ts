import { describe, expect, it } from 'vitest';
import type { Expense } from './pb';
import { byCategory, byPeriod, inRange, monthsIn, niceTicks, rangeBounds } from './stats';

const ex = (date: string, cents: number, category = 'food', paid_by = 'a'): Expense =>
  ({ date: `${date} 12:00:00.000Z`, amount_cents: cents, category, paid_by }) as Expense;

describe('rangeBounds', () => {
  it('handles month and year edges', () => {
    expect(rangeBounds('this-month', '2026-10-17', [])).toEqual({ from: '2026-10-01', to: '2026-10-17' });
    expect(rangeBounds('last-month', '2026-03-05', [])).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(rangeBounds('last-month', '2026-01-05', [])).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(rangeBounds('3-months', '2026-02-10', [])).toEqual({ from: '2025-12-01', to: '2026-02-10' });
    expect(rangeBounds('12-months', '2026-10-17', [])).toEqual({ from: '2025-11-01', to: '2026-10-17' });
    expect(rangeBounds('this-year', '2026-10-17', [])).toEqual({ from: '2026-01-01', to: '2026-10-17' });
    expect(rangeBounds('all', '2026-10-17', [ex('2019-01-21', 1)])).toEqual({ from: '2019-01-21', to: '2026-10-17' });
  });
});

describe('summaries', () => {
  const list = [ex('2026-09-30', 500), ex('2026-10-01', 1000), ex('2026-10-02', 3000, 'rent', 'b'), ex('2026-10-03', 500, '')];

  it('filters by inclusive range', () => {
    expect(inRange(list, '2026-10-01', '2026-10-02')).toHaveLength(2);
  });

  it('totals categories largest first', () => {
    const c = byCategory(inRange(list, '2026-10-01', '2026-10-31'));
    expect(c.map((x) => [x.category, x.cents, x.count])).toEqual([
      ['rent', 3000, 1],
      ['food', 1000, 1],
      ['', 500, 1],
    ]);
    expect(c[0].share).toBeCloseTo(2 / 3);
    expect(c.map((x) => x.paid)).toEqual([{ b: 3000 }, { a: 1000 }, { a: 500 }]);
  });

  it('fills empty months and groups long ranges by year', () => {
    const months = byPeriod(list, '2026-08-01', '2026-10-17');
    expect(months.map((p) => [p.key, p.cents])).toEqual([
      ['2026-08', 0],
      ['2026-09', 500],
      ['2026-10', 4500],
    ]);
    const years = byPeriod(list, '2023-01-01', '2026-10-17');
    expect(years.map((p) => p.key)).toEqual(['2023', '2024', '2025', '2026']);
    expect(years.at(-1)!.cents).toBe(5000);
  });

  it('counts months and picks round ticks', () => {
    expect(monthsIn('2025-11-01', '2026-10-17')).toBe(12);
    expect(niceTicks(180000)).toEqual([0, 100000, 200000]);
    expect(niceTicks(4200)).toEqual([0, 2500, 5000]);
    expect(niceTicks(0)).toEqual([0]);
  });
});
