<script lang="ts">
  import { app, type Entry } from '../lib/state.svelte';
  import { formatCents } from '../lib/money';
  import { dayOf } from '../lib/pb';

  let { entry, onclick }: { entry: Entry; onclick: () => void } = $props();

  const shortDate = (d: string) =>
    new Date(dayOf(d) + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
</script>

<button class="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-100 dark:active:bg-slate-800" {onclick}>
  {#if entry.kind === 'expense'}
    {@const e = entry.item}
    {@const mine = e.paid_by === app.me?.id}
    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl dark:bg-slate-800">
      {app.category(e.category)?.emoji ?? '🧾'}
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate font-medium">{e.description}</span>
      <span class="block truncate text-sm text-slate-500">
        {e.recurring ? '🔁 ' : ''}{app.nameOf(e.paid_by)} paid {formatCents(e.amount_cents)} · {shortDate(e.date)}
      </span>
    </span>
    <span class="shrink-0 text-right">
      {#if e.owed_cents === 0}
        <span class="text-sm text-slate-400">not shared</span>
      {:else}
        <span class="block text-xs text-slate-500">{mine ? 'you lent' : 'you owe'}</span>
        <span class="block font-semibold {mine ? 'text-brand-600' : 'text-orange-600'}">{formatCents(e.owed_cents)}</span>
      {/if}
    </span>
  {:else}
    {@const s = entry.item}
    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl dark:bg-brand-700/30">💸</span>
    <span class="min-w-0 flex-1">
      <span class="block truncate font-medium">{app.nameOf(s.from_user)} paid {s.to_user === app.me?.id ? 'you' : app.nameOf(s.to_user)}</span>
      <span class="block text-sm text-slate-500">Settlement · {shortDate(s.date)}</span>
    </span>
    <span class="shrink-0 font-semibold">{formatCents(s.amount_cents)}</span>
  {/if}
</button>
