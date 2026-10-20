import { describe, expect, it } from 'vitest';
import { enqueue, overlay, unreachable, type Op } from './outbox';

const op = (action: Op['action'], target: string, data: Record<string, unknown> = {}, collection: Op['collection'] = 'expenses'): Op => ({
  collection,
  action,
  target,
  data,
  queued: '2026-10-20 18:00:00.000Z',
});

describe('enqueue', () => {
  it('folds edits of an unsynced record into its create', () => {
    let ops = enqueue([], op('create', 'local-1', { description: 'Bread', amount_cents: 300 }));
    ops = enqueue(ops, op('update', 'local-1', { amount_cents: 350 }));
    expect(ops).toHaveLength(1);
    expect(ops[0].data).toEqual({ description: 'Bread', amount_cents: 350 });
  });

  it('drops an unsynced record that is deleted', () => {
    const ops = enqueue(enqueue([], op('create', 'local-1')), op('delete', 'local-1'));
    expect(ops).toEqual([]);
  });

  it('merges edits of a synced record and lets a delete replace them', () => {
    let ops = enqueue([], op('update', 'abc', { amount_cents: 1 }));
    ops = enqueue(ops, op('update', 'abc', { description: 'X' }));
    expect(ops).toHaveLength(1);
    expect(ops[0].data).toEqual({ amount_cents: 1, description: 'X' });
    ops = enqueue(ops, op('delete', 'abc'));
    expect(ops.map((o) => o.action)).toEqual(['delete']);
  });
});

describe('overlay', () => {
  const server = [{ id: 'abc', description: 'Rent', amount_cents: 100000, split_mode: 'equal', owed_cents: 50000 }];

  it('shows queued creates first, with what the server would fill in', () => {
    const ops = [op('create', 'local-1', { description: 'Bread', amount_cents: 301, split_mode: 'equal', category: null })];
    const [first, second] = overlay(server, ops, 'expenses', 'me') as Record<string, unknown>[];
    expect(first).toMatchObject({ id: 'local-1', owed_cents: 150, category: '', recurring: '', created: ops[0].queued });
    expect(second.id).toBe('abc');
  });

  it('applies edits and deletes, and ignores other collections', () => {
    expect(overlay(server, [op('update', 'abc', { split_mode: 'full' })], 'expenses', 'me')[0]).toMatchObject({ owed_cents: 100000 });
    expect(overlay(server, [op('delete', 'abc')], 'expenses', 'me')).toEqual([]);
    expect(overlay(server, [op('delete', 'abc', {}, 'settlements')], 'expenses', 'me')).toHaveLength(1);
  });

  it('makes me the author of a queued comment', () => {
    const [c] = overlay([], [op('create', 'local-2', { expense: 'abc', text: 'hi' }, 'expense_comments')], 'expense_comments', 'me');
    expect(c).toMatchObject({ author: 'me', text: 'hi' });
  });
});

it('tells an unreachable NAS from a refused request', () => {
  expect(unreachable({ status: 0 })).toBe(true);
  expect(unreachable({ status: 0, isAbort: true })).toBe(false);
  expect(unreachable({ status: 400 })).toBe(false);
});
