<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { app } from '../lib/state.svelte';
  import { formatCents, owedCents, parseAmount } from '../lib/money';
  import { dayOf, pb, toPbDate, today, type Expense, type SplitMode } from '../lib/pb';

  let { expense, onclose }: { expense: Expense | null; onclose: () => void } = $props();

  // the form edits a copy; later prop changes don't reset what was typed
  const initial = untrack(() => expense);

  const centsText = (c: number) => (c / 100).toFixed(2);

  let amountText = $state(initial ? centsText(initial.amount_cents) : '');
  let description = $state(initial?.description ?? '');
  let paidBy = $state(initial?.paid_by ?? app.me?.id ?? '');
  let mode = $state<SplitMode>(initial?.split_mode ?? 'equal');
  let payerPercent = $state(initial?.split_mode === 'percent' ? initial.payer_percent : 50);
  let otherShareText = $state(initial?.split_mode === 'exact' ? centsText(initial.other_share_cents) : '');
  let category = $state(initial?.category ?? '');
  let day = $state(initial ? dayOf(initial.date) : today());
  let note = $state(initial?.note ?? '');
  let busy = $state(false);
  let error = $state('');

  let amountInput: HTMLInputElement | undefined = $state();
  onMount(() => {
    if (!initial) amountInput?.focus();
  });

  const amount = $derived(parseAmount(amountText));
  const otherShare = $derived(mode === 'exact' ? (parseAmount(otherShareText) ?? (otherShareText.trim() === '0' ? 0 : NaN)) : 0);
  const owed = $derived(amount ? owedCents(amount, mode, payerPercent, otherShare) : null);
  const payerName = $derived(app.nameOf(paidBy));
  const otherId = $derived(app.users.find((u) => u.id !== paidBy)?.id ?? '');
  const otherName = $derived(app.nameOf(otherId));
  const valid = $derived(amount !== null && owed !== null && description.trim() !== '' && !!paidBy);

  const suggestions = $derived([...new Set(app.expenses.map((e) => e.description))].slice(0, 30));

  const modes: { id: SplitMode; label: () => string }[] = [
    { id: 'equal', label: () => '50 / 50' },
    { id: 'percent', label: () => '%' },
    { id: 'exact', label: () => 'Exact' },
    { id: 'full', label: () => `${otherName} owes all` },
  ];

  // picking a past description pre-fills its category
  function onDescriptionChange() {
    if (category) return;
    const past = app.expenses.find((e) => e.description === description.trim());
    if (past) category = past.category;
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!valid) return;
    busy = true;
    error = '';
    const data = {
      description: description.trim(),
      amount_cents: amount,
      paid_by: paidBy,
      split_mode: mode,
      payer_percent: mode === 'percent' ? payerPercent : 0,
      other_share_cents: mode === 'exact' ? otherShare : 0,
      category: category || null,
      date: toPbDate(day),
      note: note.trim(),
    };
    try {
      if (expense) await pb.collection('expenses').update(expense.id, data);
      else await pb.collection('expenses').create(data);
      onclose();
      app.reload();
    } catch (err) {
      error = (err as { message?: string }).message ?? 'Could not save.';
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!expense || !confirm(`Delete “${expense.description}”?`)) return;
    busy = true;
    try {
      await pb.collection('expenses').delete(expense.id);
      onclose();
      app.reload();
    } finally {
      busy = false;
    }
  }
</script>

<form class="flex flex-col gap-4" onsubmit={save}>
  <div class="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 dark:bg-slate-800">
    <span class="text-3xl font-semibold text-slate-400">€</span>
    <input
      bind:this={amountInput}
      class="min-w-0 flex-1 border-0 bg-transparent px-0 py-4 text-4xl font-bold focus:ring-0 dark:bg-transparent"
      inputmode="decimal"
      placeholder="0.00"
      aria-label="Amount"
      bind:value={amountText}
    />
  </div>

  <input
    list="desc-suggestions"
    placeholder="What was it for?"
    aria-label="Description"
    maxlength="200"
    bind:value={description}
    oninput={onDescriptionChange}
  />
  <datalist id="desc-suggestions">
    {#each suggestions as s (s)}<option value={s}></option>{/each}
  </datalist>

  <div>
    <p class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Paid by</p>
    <div class="grid grid-cols-2 gap-2">
      {#each app.users as u (u.id)}
        <button type="button" class="chip py-3 text-base" aria-pressed={paidBy === u.id} onclick={() => (paidBy = u.id)}>
          {app.nameOf(u.id)}
        </button>
      {/each}
    </div>
  </div>

  <div>
    <p class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Split</p>
    <div class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {#each modes as m (m.id)}
        <button type="button" class="chip" aria-pressed={mode === m.id} onclick={() => (mode = m.id)}>{m.label()}</button>
      {/each}
    </div>

    {#if mode === 'percent'}
      <div class="mt-3">
        <input class="w-full accent-brand-600 border-0 px-0" type="range" min="0" max="100" step="5" bind:value={payerPercent} aria-label="Payer share" />
        <div class="flex justify-between text-sm">
          <span>{payerName}: <b>{payerPercent}%</b></span>
          <span>{otherName}: <b>{100 - payerPercent}%</b></span>
        </div>
      </div>
    {:else if mode === 'exact'}
      <div class="mt-3 flex items-center gap-2">
        <span class="text-sm whitespace-nowrap">{otherName}’s share €</span>
        <input class="min-w-0 flex-1" inputmode="decimal" placeholder="0.00" bind:value={otherShareText} />
      </div>
    {/if}

    {#if amount && owed !== null}
      <p class="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
        {owed === 0 ? 'Nothing is shared.' : `${otherName} ${otherName === 'You' ? 'owe' : 'owes'} ${payerName === 'You' ? 'you' : payerName} ${formatCents(owed)}`}
      </p>
    {:else if amount && mode === 'exact' && otherShareText}
      <p class="mt-3 text-sm text-red-600">The share can’t be more than the amount.</p>
    {/if}
  </div>

  <div>
    <p class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Category</p>
    <div class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {#each app.categories as c (c.id)}
        <button type="button" class="chip" aria-pressed={category === c.id} onclick={() => (category = c.id)}>
          {c.emoji} {c.name}
        </button>
      {/each}
    </div>
  </div>

  <div class="grid grid-cols-2 gap-2">
    <input type="date" aria-label="Date" bind:value={day} required />
    <input placeholder="Note (optional)" aria-label="Note" maxlength="1000" bind:value={note} />
  </div>

  {#if error}<p class="text-sm text-red-600">{error}</p>{/if}

  <button class="btn-primary" disabled={!valid || busy}>{expense ? 'Save changes' : 'Add expense'}</button>
  {#if expense}
    <button type="button" class="py-2 text-sm font-medium text-red-600" onclick={remove} disabled={busy}>Delete expense</button>
  {/if}
</form>
