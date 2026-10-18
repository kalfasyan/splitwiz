<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { formatCents, parseAmount } from '../lib/money';
  import { pb, today } from '../lib/pb';
  import { monthOutlook, suggestBudget } from '../lib/budget';
  import MonthChart from './MonthChart.svelte';

  const outlook = $derived(monthOutlook(app.expenses, app.recurring, today()));
  const budget = $derived(app.budget?.monthly_cents ?? 0);
  const left = $derived(outlook.days - outlook.day);
  const diff = $derived(budget - outlook.projected);

  let editing = $state(false);
  let amountText = $state('');
  let busy = $state(false);

  function edit() {
    const start = budget || suggestBudget(app.expenses, today());
    amountText = start ? String(start / 100) : '';
    editing = true;
  }

  async function save(cents: number) {
    if (!app.budget) return;
    busy = true;
    try {
      await pb.collection('budget').update(app.budget.id, { monthly_cents: cents });
      await app.reload();
      editing = false;
    } finally {
      busy = false;
    }
  }

  const typed = $derived(parseAmount(amountText));
  const suggested = $derived(suggestBudget(app.expenses, today()));
</script>

<section class="mx-4 mt-2 rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900">
  <div class="flex items-baseline justify-between gap-2">
    <h2 class="font-semibold">This month</h2>
    {#if app.budget && !editing}
      <button class="text-sm font-medium text-brand-600" onclick={edit}>
        {budget ? `Budget ${formatCents(budget)}` : 'Set a budget'}
      </button>
    {/if}
  </div>

  {#if editing}
    <form
      class="mt-3 flex flex-col gap-2"
      onsubmit={(e) => {
        e.preventDefault();
        if (typed) save(typed);
      }}
    >
      <label for="budget" class="text-sm text-slate-500">Monthly budget for the two of you</label>
      <div class="flex gap-2">
        <input id="budget" class="min-w-0 flex-1" inputmode="decimal" placeholder="0.00" bind:value={amountText} />
        <button class="btn-primary px-4 py-3" disabled={busy || !typed}>Save</button>
      </div>
      {#if suggested && !budget}
        <p class="text-sm text-slate-500">Suggested from your last three months: {formatCents(suggested)} a month.</p>
      {/if}
      <div class="flex gap-4 text-sm font-medium">
        <button type="button" class="text-slate-500" onclick={() => (editing = false)}>Cancel</button>
        {#if budget}
          <button type="button" class="text-red-600" disabled={busy} onclick={() => save(0)}>Remove budget</button>
        {/if}
      </div>
    </form>
  {/if}

  <p class="mt-2 text-4xl font-bold tracking-tight">{formatCents(outlook.spent)}</p>
  <p class="mt-1 text-sm text-slate-500">
    {budget ? `spent of ${formatCents(budget)}` : 'spent so far'} · {left === 0 ? 'last day' : `${left} ${left === 1 ? 'day' : 'days'} left`}
  </p>

  <MonthChart {outlook} {budget} />

  <div class="mt-3 rounded-2xl px-3 py-2 {budget && diff < 0 ? 'bg-orange-50 dark:bg-orange-950/40' : 'bg-slate-100 dark:bg-slate-800'}">
    <p class="text-sm">
      Heading for <b>{formatCents(outlook.projected)}</b> by the end of the month{#if budget}, <b class={diff < 0 ? 'text-orange-600' : 'text-brand-600'}
          >{formatCents(Math.abs(diff))} {diff < 0 ? 'over' : 'under'} budget</b
        >{/if}.
    </p>
    <p class="mt-0.5 text-xs text-slate-500">
      Everyday spending trend {formatCents(Math.round(outlook.perDay))} a day{outlook.scheduled
        ? `, plus ${formatCents(outlook.scheduled)} of repeating expenses still due`
        : ''}.{outlook.day < 7 ? ' This firms up after the first week.' : ''}
    </p>
  </div>
</section>
