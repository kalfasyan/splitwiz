<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { formatCents } from '../lib/money';
  import { today } from '../lib/pb';
  import { CATEGORY_ALERT_SHARE, categoryLimits } from '../lib/budget';

  const limits = $derived(categoryLimits(app.expenses, app.categories, today()));
</script>

{#if limits.length}
  <section class="mx-4 mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900">
    <h2 class="font-semibold">Category limits this month</h2>
    <ul class="mt-3 flex flex-col gap-3">
      {#each limits as l (l.category.id)}
        {@const over = l.share > 1}
        {@const close = l.share >= CATEGORY_ALERT_SHARE}
        <li>
          <span class="flex items-baseline justify-between gap-2 text-sm">
            <span class="min-w-0 truncate">{l.category.emoji} {l.category.name}</span>
            <span class="shrink-0 tabular-nums">
              <b class={over ? 'text-red-600' : close ? 'text-orange-600' : ''}>{formatCents(l.spent)}</b>
              <span class="text-slate-500">of {formatCents(l.category.monthly_cents)}</span>
            </span>
          </span>
          <span class="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <span
              class="block h-2 rounded-full {over ? 'bg-red-600' : close ? 'bg-orange-500' : 'bg-brand-600'}"
              style="width: {Math.min(100, l.share * 100)}%"
            ></span>
          </span>
          <span class="mt-1 block text-xs text-slate-500">
            {over
              ? `${formatCents(l.spent - l.category.monthly_cents)} over`
              : `${formatCents(l.category.monthly_cents - l.spent)} left`}
          </span>
        </li>
      {/each}
    </ul>
  </section>
{:else if app.categories.length}
  <p class="px-5 pt-3 text-xs text-slate-500">Tip: give a category its own monthly limit under Settings › Categories.</p>
{/if}
