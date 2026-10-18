import PocketBase from 'pocketbase';

// The app is served by PocketBase itself, so the API is always same-origin.
export const pb = new PocketBase(window.location.origin);
pb.autoCancellation(false);

export type User = { id: string; name: string; email: string };
export type Category = { id: string; name: string; emoji: string; sort: number };
export type SplitMode = 'equal' | 'percent' | 'exact' | 'full';

export type Expense = {
  id: string;
  description: string;
  amount_cents: number;
  paid_by: string;
  split_mode: SplitMode;
  payer_percent: number;
  other_share_cents: number;
  owed_cents: number;
  category: string;
  date: string;
  note: string;
  recurring: string;
  created: string;
};

export type Every = 'week' | 'month' | 'year';

/** A template the server turns into an expense on each due date. */
export type Recurring = {
  id: string;
  description: string;
  amount_cents: number;
  paid_by: string;
  split_mode: SplitMode;
  payer_percent: number;
  other_share_cents: number;
  owed_cents: number;
  category: string;
  note: string;
  every: Every;
  next_date: string;
  anchor_day: number;
  paused: boolean;
  created: string;
};

/** The household's shared monthly spending budget; 0 = none set. */
export type Budget = { id: string; monthly_cents: number };

export type Settlement = {
  id: string;
  from_user: string;
  to_user: string;
  amount_cents: number;
  date: string;
  note: string;
  created: string;
};

export type Summary = {
  users: { id: string; name: string }[];
  balance: { debtor: string; creditor: string; amount_cents: number };
  net: Record<string, number>;
};

/** Dates are stored at noon UTC so the calendar day never shifts between time zones. */
export function toPbDate(day: string): string {
  return `${day} 12:00:00.000Z`;
}

export function dayOf(pbDate: string): string {
  return pbDate.slice(0, 10);
}

export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
