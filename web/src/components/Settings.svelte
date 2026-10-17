<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { formatCents } from '../lib/money';
  import { dayOf, pb, today, type Recurring } from '../lib/pb';
  import ImportSplitwise from './ImportSplitwise.svelte';
  import { suggestMonthly, type Suggestion } from '../lib/recurring';
  import { startSeries } from '../lib/series';

  let { editRecurring }: { editRecurring: (r: Recurring) => void } = $props();

  const everyLabel = { week: 'Weekly', month: 'Monthly', year: 'Yearly' };
  const shortDate = (d: string) =>
    new Date(dayOf(d) + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const suggestions = $derived(suggestMonthly(app.expenses, app.recurring, today()));
  let making = $state('');
  const ordinal = (n: number) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

  async function makeMonthly(s: Suggestion) {
    making = s.latest.id;
    try {
      await startSeries(s.latest, 'month', s.matches);
      await app.reload();
    } finally {
      making = '';
    }
  }

  async function togglePause(r: Recurring) {
    await pb.collection('recurring_expenses').update(r.id, { paused: !r.paused });
    await app.reload();
  }

  let name = $state(app.me?.name ?? '');
  let saved = $state(false);
  let busy = $state(false);

  async function saveName() {
    if (!app.me) return;
    busy = true;
    try {
      const rec = await pb.collection('users').update(app.me.id, { name: name.trim() });
      app.me = { ...app.me, name: rec.name };
      saved = true;
      setTimeout(() => (saved = false), 1500);
      await app.reload();
    } finally {
      busy = false;
    }
  }

  async function exportCsv() {
    const res = await fetch('/api/splitwiz/export.csv', { headers: { Authorization: pb.authStore.token } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `splitwiz-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<header class="px-5 pt-6 pb-4">
  <h1 class="text-2xl font-bold">Settings</h1>
</header>

<div class="flex flex-col gap-6 px-4">
  <section class="flex flex-col gap-2">
    <label for="name" class="px-1 text-sm font-medium text-slate-600 dark:text-slate-300">Your name</label>
    <div class="flex gap-2">
      <input id="name" class="min-w-0 flex-1" bind:value={name} maxlength="40" />
      <button class="btn-primary px-4 py-3" onclick={saveName} disabled={busy || !name.trim()}>
        {saved ? 'Saved' : 'Save'}
      </button>
    </div>
    <p class="px-1 text-sm text-slate-500">Signed in as {app.me?.email}</p>
  </section>

  <section class="flex flex-col gap-2">
    <h2 class="px-1 font-semibold">Repeating expenses</h2>
    {#if app.recurring.length === 0}
      <p class="px-1 text-sm text-slate-500">None yet. When adding an expense, pick Weekly, Monthly or Yearly under Repeat.</p>
    {:else}
      <div class="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {#each app.recurring as r (r.id)}
          <div class="flex items-center gap-3 px-4 py-3">
            <button class="min-w-0 flex-1 text-left" onclick={() => editRecurring(r)}>
              <span class="block truncate font-medium {r.paused ? 'text-slate-400' : ''}">
                {app.category(r.category)?.emoji ?? '🔁'} {r.description}
              </span>
              <span class="block truncate text-sm text-slate-500">
                {formatCents(r.amount_cents)} · {everyLabel[r.every]} · {r.paused ? 'paused' : `next ${shortDate(r.next_date)}`}
              </span>
            </button>
            <button class="chip" onclick={() => togglePause(r)}>{r.paused ? 'Resume' : 'Pause'}</button>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  {#if suggestions.length}
    <section class="flex flex-col gap-2">
      <h2 class="px-1 font-semibold">These look monthly</h2>
      <p class="px-1 text-sm text-slate-500">They came back on about the same day for the last three months.</p>
      <div class="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {#each suggestions as s (s.latest.id)}
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{app.category(s.latest.category)?.emoji ?? '🧾'} {s.latest.description}</span>
              <span class="block truncate text-sm text-slate-500">
                {formatCents(s.latest.amount_cents)} · around the {ordinal(Number(dayOf(s.latest.date).slice(8)))} · {s.matches.length} times so far
              </span>
            </span>
            <button class="chip" onclick={() => makeMonthly(s)} disabled={!!making}>
              {making === s.latest.id ? 'Saving…' : 'Make monthly'}
            </button>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <ImportSplitwise />

  <section class="flex flex-col gap-3">
    <button class="btn-secondary" onclick={exportCsv}>Export all data (CSV)</button>
    <button class="btn-secondary text-red-600" onclick={() => app.logout()}>Sign out</button>
  </section>

  <p class="text-center text-xs text-slate-400">Splitwiz · running on your NAS</p>
</div>
