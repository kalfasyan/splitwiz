import { describe, expect, it } from 'vitest';
import type { Expense, Recurring } from './pb';
import { monthOutlook, slope, suggestBudget } from './budget';

const ex = (date: string, cents: number, recurring = ''): Expense =>
  ({ date: `${date} 12:00:00.000Z`, amount_cents: cents, recurring }) as Expense;

const rent = (next: string, extra: Partial<Recurring> = {}): Recurring =>
  ({ id: 'r', amount_cents: 90000, every: 'month', next_date: `${next} 12:00:00.000Z`, anchor_day: 0, paused: false, ...extra }) as Recurring;

describe('slope', () => {
  it('fits a straight line and never goes negative', () => {
    expect(slope([0, 10, 20, 30])).toBeCloseTo(10);
    expect(slope([0, 0, 30])).toBeCloseTo(15);
    expect(slope([5])).toBe(0);
    expect(slope([30, 20, 10])).toBe(0);
  });
});

describe('monthOutlook', () => {
  it('continues everyday spending and adds scheduled charges on their day', () => {
    // 10 a day for the first 10 days of a 30-day month, rent still to come on the 25th
    const list = Array.from({ length: 10 }, (_, i) => ex(`2026-11-${String(i + 1).padStart(2, '0')}`, 1000));
    const o = monthOutlook([...list, ex('2026-10-31', 99999), ex('2026-11-12', 99999)], [rent('2026-11-25')], '2026-11-10');
    expect(o.days).toBe(30);
    expect(o.spent).toBe(10000);
    expect(o.cumulative).toHaveLength(10);
    expect(o.perDay).toBeCloseTo(1000);
    expect(o.scheduled).toBe(90000);
    expect(o.projection).toHaveLength(21);
    expect(o.projection[14]).toBe(10000 + 14 * 1000); // the 24th
    expect(o.projection[15]).toBe(10000 + 15 * 1000 + 90000); // the 25th
    expect(o.projected).toBe(30000 + 90000);
  });

  it('keeps repeating charges already added out of the trend', () => {
    const o = monthOutlook([ex('2026-11-01', 90000, 'r'), ex('2026-11-02', 2000)], [rent('2026-12-01')], '2026-11-02');
    expect(o.spent).toBe(92000);
    expect(o.perDay).toBeCloseTo(1000);
    expect(o.scheduled).toBe(0);
    expect(o.projected).toBe(92000 + 28 * 1000);
  });

  it('counts a charge due today that is not added yet, and skips paused ones', () => {
    const o = monthOutlook([], [rent('2026-11-10'), rent('2026-11-20', { paused: true })], '2026-11-10');
    expect(o.projection[0]).toBe(90000);
    expect(o.projected).toBe(90000);
  });
});

describe('suggestBudget', () => {
  it('averages the last three full months, rounded up to 50', () => {
    const list = [ex('2026-07-15', 100000), ex('2026-08-01', 120000), ex('2026-09-30', 130010), ex('2026-10-02', 50000), ex('2026-11-01', 1)];
    expect(suggestBudget(list, '2026-11-10')).toBe(105000);
    expect(suggestBudget([], '2026-11-10')).toBe(0);
  });
});
