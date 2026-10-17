import { describe, expect, it } from 'vitest';
import type { Expense, Recurring } from './pb';
import { nextDate, suggestMonthly } from './recurring';

const ex = (date: string, description: string, amount_cents = 9839, extra: Partial<Expense> = {}): Expense =>
  ({
    id: date + description,
    date: `${date} 12:00:00.000Z`,
    description,
    amount_cents,
    paid_by: 'a',
    split_mode: 'equal',
    owed_cents: Math.floor(amount_cents / 2),
    recurring: '',
    ...extra,
  }) as Expense;

describe('nextDate', () => {
  it('matches the server rules', () => {
    expect(nextDate('2026-10-16', 'month')).toBe('2026-11-16');
    expect(nextDate('2026-12-05', 'month')).toBe('2027-01-05');
    expect(nextDate('2027-01-31', 'month')).toBe('2027-02-28');
    expect(nextDate('2026-12-28', 'week')).toBe('2027-01-04');
    expect(nextDate('2028-02-29', 'year')).toBe('2029-02-28');
  });
});

describe('suggestMonthly', () => {
  const today = '2026-10-17';

  it('finds a charge repeated on about the same day for three months', () => {
    const list = [
      ex('2026-08-16', 'KBC insurance car'),
      ex('2026-09-16', 'KBC insurance  car '),
      ex('2026-10-16', 'kbc insurance car'),
      ex('2026-10-01', 'Fuel', 7441),
      ex('2026-09-02', 'Fuel', 5380),
      ex('2026-08-05', 'Fuel', 7156),
    ];
    const s = suggestMonthly(list, [], today);
    expect(s).toHaveLength(1);
    expect(s[0].latest.date.slice(0, 10)).toBe('2026-10-16');
    expect(s[0].matches).toHaveLength(3);
  });

  it('skips stopped, irregular, existing or already linked charges', () => {
    const stopped = [ex('2026-05-28', 'Rent'), ex('2026-06-28', 'Rent'), ex('2026-07-28', 'Rent')];
    const gap = [ex('2026-06-14', 'Gym'), ex('2026-08-14', 'Gym'), ex('2026-10-14', 'Gym')];
    const drift = [ex('2026-08-01', 'Box'), ex('2026-09-15', 'Box'), ex('2026-10-01', 'Box')];
    const linked = [ex('2026-08-09', 'Power', 100, { recurring: 'x' }), ex('2026-09-09', 'Power', 100, { recurring: 'x' }), ex('2026-10-09', 'Power', 100, { recurring: 'x' })];
    const known = [ex('2026-08-14', 'KBC'), ex('2026-09-14', 'KBC'), ex('2026-10-14', 'KBC')];
    const series = [{ description: 'kbc' } as Recurring];
    expect(suggestMonthly([...stopped, ...gap, ...drift, ...linked, ...known], series, today)).toEqual([]);
  });
});
