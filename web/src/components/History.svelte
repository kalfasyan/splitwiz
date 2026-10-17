<script lang="ts">
  import { app, type Entry } from '../lib/state.svelte';
  import { formatCents } from '../lib/money';
  import type { Expense, Settlement } from '../lib/pb';
  import EntryRow from './EntryRow.svelte';

  let { editExpense, editSettlement }: { editExpense: (e: Expense) => void; editSettlement: (s: Settlement) => void } =
    $props();

  let query = $state('');
  const PAGE = 200;
  let shown = $state(PAGE);

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return app.entries.slice(0, shown);
    return app.entries.filter((e) => {
      if (e.kind === 'settlement') return 'settlement payment'.includes(q) || e.item.note.toLowerCase().includes(q);
      const cat = app.category(e.item.category)?.name ?? '';
      return [e.item.description, e.item.note, cat].some((t) => t.toLowerCase().includes(q));
    });
  });

  const months = $derived.by(() => {
    const groups: { key: string; label: string; total: number; entries: Entry[] }[] = [];
    for (const e of filtered) {
      const key = e.date.slice(0, 7);
      let g = groups.at(-1);
      if (!g || g.key !== key) {
        const label = new Date(key + '-15T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        g = { key, label, total: 0, entries: [] };
        groups.push(g);
      }
      g.entries.push(e);
      if (e.kind === 'expense') g.total += e.item.amount_cents;
    }
    return groups;
  });
</script>

<header class="sticky top-0 z-10 bg-slate-50/95 px-4 pt-6 pb-3 backdrop-blur dark:bg-slate-950/95">
  <h1 class="mb-3 px-1 text-2xl font-bold">History</h1>
  <input class="w-full" type="search" placeholder="Search expenses" bind:value={query} />
</header>

{#if months.length === 0}
  <p class="px-5 py-10 text-center text-slate-500">{query ? 'Nothing matches.' : 'No expenses yet.'}</p>
{/if}

{#each months as m (m.key)}
  <section class="mb-2">
    <div class="flex items-baseline justify-between px-5 pt-4 pb-1 text-sm">
      <h2 class="font-semibold text-slate-600 dark:text-slate-300">{m.label}</h2>
      <span class="text-slate-500">{formatCents(m.total)} spent</span>
    </div>
    <div class="divide-y divide-slate-100 dark:divide-slate-800">
      {#each m.entries as entry (entry.item.id)}
        <EntryRow
          {entry}
          onclick={() => (entry.kind === 'expense' ? editExpense(entry.item) : editSettlement(entry.item))}
        />
      {/each}
    </div>
  </section>
{/each}

{#if !query.trim() && app.entries.length > shown}
  <div class="px-4 py-4">
    <button class="btn-secondary w-full" onclick={() => (shown += PAGE)}>Show older</button>
  </div>
{/if}
