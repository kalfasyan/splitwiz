<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '../lib/state.svelte';
  import { formatCents, parseAmount } from '../lib/money';
  import { dayOf, toPbDate, today, type Settlement } from '../lib/pb';

  let { settlement, onclose }: { settlement: Settlement | null; onclose: () => void } = $props();

  // the form edits a copy; later prop changes don't reset what was typed
  const initial = untrack(() => settlement);

  const balance = app.summary?.balance;
  const meId = app.me?.id ?? '';
  const otherId = app.other?.id ?? '';

  let from = $state(initial?.from_user ?? balance?.debtor ?? meId);
  let to = $derived(from === meId ? otherId : meId);
  let amountText = $state(
    initial ? (initial.amount_cents / 100).toFixed(2) : balance?.amount_cents ? (balance.amount_cents / 100).toFixed(2) : '',
  );
  let day = $state(initial ? dayOf(initial.date) : today());
  let note = $state(initial?.note ?? '');
  let busy = $state(false);
  let error = $state('');

  const amount = $derived(parseAmount(amountText));
  const label = (id: string) => (id === meId ? 'You' : app.nameOf(id));

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!amount) return;
    busy = true;
    error = '';
    const data = { from_user: from, to_user: to, amount_cents: amount, date: toPbDate(day), note: note.trim() };
    try {
      await app.write('settlements', settlement ? 'update' : 'create', settlement?.id ?? null, data);
      onclose();
    } catch (err) {
      error = (err as { message?: string }).message ?? 'Could not save.';
    } finally {
      busy = false;
    }
  }

  function remove() {
    if (!settlement) return;
    app.remove('settlements', settlement.id, `Deleted the ${formatCents(settlement.amount_cents)} payment`);
    onclose();
  }
</script>

<form class="flex flex-col gap-4" onsubmit={save}>
  <div class="flex items-center justify-center gap-3 text-lg">
    <b>{label(from)}</b>
    <button type="button" class="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800" onclick={() => (from = to)} aria-label="Swap direction">
      paid ⇄
    </button>
    <b>{label(to)}</b>
  </div>

  <div class="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 dark:bg-slate-800">
    <span class="text-3xl font-semibold text-slate-400">€</span>
    <input
      class="min-w-0 flex-1 border-0 bg-transparent px-0 py-4 text-4xl font-bold focus:ring-0 dark:bg-transparent"
      inputmode="decimal"
      aria-label="Amount"
      bind:value={amountText}
    />
  </div>
  {#if !settlement && balance?.amount_cents}
    <p class="-mt-2 text-center text-sm text-slate-500">Full balance is {formatCents(balance.amount_cents)}</p>
  {/if}

  <div class="grid grid-cols-2 gap-2">
    <input type="date" aria-label="Date" bind:value={day} required />
    <input placeholder="Note (optional)" aria-label="Note" bind:value={note} />
  </div>

  {#if error}<p class="text-sm text-red-600">{error}</p>{/if}

  <button class="btn-primary" disabled={!amount || busy}>{settlement ? 'Save changes' : 'Record payment'}</button>
  {#if settlement}
    <button type="button" class="py-2 text-sm font-medium text-red-600" onclick={remove} disabled={busy}>Delete payment</button>
  {/if}
</form>
