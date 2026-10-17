<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { formatCents } from '../lib/money';
  import { dayOf, today, type Expense } from '../lib/pb';
  import { byCategory, byPeriod, inRange, monthsIn, niceTicks, paidBy, rangeBounds, ranges, type RangeId } from '../lib/stats';

  let { editExpense }: { editExpense: (e: Expense) => void } = $props();

  let range = $state<RangeId>('12-months');
  // category id being drilled into; null = all categories
  let focus = $state<string | null>(null);
  // period the readout above the column chart describes; null = latest
  let active = $state<number | null>(null);

  const bounds = $derived(rangeBounds(range, today(), app.expenses));
  const list = $derived(inRange(app.expenses, bounds.from, bounds.to));
  const focused = $derived(focus === null ? list : list.filter((e) => e.category === focus));

  const total = $derived(list.reduce((s, e) => s + e.amount_cents, 0));
  const perMonth = $derived(Math.round(total / monthsIn(bounds.from, bounds.to)));
  const paid = $derived(paidBy(list));
  const categories = $derived(byCategory(list));
  const periods = $derived(byPeriod(focused, bounds.from, bounds.to));
  const biggest = $derived([...focused].sort((a, b) => b.amount_cents - a.amount_cents).slice(0, 5));

  const catName = (id: string) => app.category(id)?.name ?? 'No category';
  const catEmoji = (id: string) => app.category(id)?.emoji ?? '🧾';

  const compact = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });
  const short = (cents: number) => compact.format(cents / 100);
  const shortDate = (d: string) => new Date(dayOf(d) + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  function pickRange(id: RangeId) {
    range = id;
    active = null;
  }

  function toggleFocus(id: string) {
    focus = focus === id ? null : id;
    active = null;
  }

  // column chart geometry, in viewBox units
  const W = 340;
  const H = 150;
  const top = 8;
  const bottom = 20;
  const left = 34;
  const right = 14; // room for the last label to centre under its bar
  const ticks = $derived(niceTicks(Math.max(0, ...periods.map((p) => p.cents))));
  const yMax = $derived(ticks.at(-1) || 1);
  const band = $derived((W - left - right) / Math.max(1, periods.length));
  const barW = $derived(Math.min(24, Math.max(4, band - 2)));
  const y = (cents: number) => top + (H - top - bottom) * (1 - cents / yMax);
  const shown = $derived(active ?? periods.length - 1);
  // label every period when they fit, otherwise every few
  const labelEvery = $derived(Math.ceil(periods.length / 6));

  /** Column path with a 4px rounded top and a square base. */
  function column(x: number, w: number, h: number): string {
    const base = H - bottom;
    if (h <= 0) return '';
    const r = Math.min(4, w / 2, h);
    return `M${x},${base}V${base - h + r}Q${x},${base - h} ${x + r},${base - h}H${x + w - r}Q${x + w},${base - h} ${x + w},${base - h + r}V${base}Z`;
  }
</script>

<header class="px-5 pt-6 pb-2">
  <h1 class="text-2xl font-bold">Stats</h1>
</header>

<div class="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]" role="group" aria-label="Time range">
  {#each ranges as r (r.id)}
    <button class="chip" aria-pressed={range === r.id} onclick={() => pickRange(r.id)}>{r.label}</button>
  {/each}
</div>

{#if list.length === 0}
  <p class="px-5 py-12 text-center text-slate-500">No expenses in this period.</p>
{:else}
  <section class="mx-4 mt-2 rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900">
    <p class="text-sm text-slate-500">Spent together</p>
    <p class="mt-1 text-5xl font-bold tracking-tight">{formatCents(total)}</p>
    <p class="mt-1 text-sm text-slate-500">
      {list.length} expenses · {formatCents(perMonth)} a month on average
    </p>
    <div class="mt-4 grid grid-cols-2 gap-3">
      {#each app.users as u (u.id)}
        <div class="rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
          <p class="text-xs text-slate-500">{app.nameOf(u.id)} paid</p>
          <p class="text-lg font-semibold">{formatCents(paid[u.id] ?? 0)}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="mx-4 mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900">
    <div class="flex items-baseline justify-between gap-2">
      <h2 class="font-semibold">
        {periods.length && periods[0].key.length === 4 ? 'Per year' : 'Per month'}{focus !== null ? ` · ${catName(focus)}` : ''}
      </h2>
      {#if periods[shown]}
        <p class="text-sm text-slate-500" aria-live="polite">
          {periods[shown].label}: <b class="text-slate-900 dark:text-slate-100">{formatCents(periods[shown].cents)}</b>
        </p>
      {/if}
    </div>
    <svg
      viewBox="0 0 {W} {H}"
      class="mt-3 w-full touch-pan-y"
      role="img"
      aria-label="Spending per period: {periods.map((p) => `${p.label} ${formatCents(p.cents)}`).join(', ')}"
      onpointerleave={() => (active = null)}
    >
      {#each ticks as t (t)}
        <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} class="stroke-slate-200 dark:stroke-slate-800" stroke-width="1" />
        <text x={left - 6} y={y(t) + 4} text-anchor="end" class="fill-slate-400 text-[10px]">{short(t)}</text>
      {/each}
      {#each periods as p, i (p.key)}
        {@const x = left + i * band + (band - barW) / 2}
        <path
          d={column(x, barW, (H - top - bottom) * (p.cents / yMax))}
          class={i === shown ? 'fill-brand-600' : 'fill-brand-500/45'}
        />
        <!-- hit target taller and wider than the bar -->
        <rect
          x={left + i * band}
          y={top}
          width={band}
          height={H - top}
          fill="transparent"
          role="presentation"
          onpointerenter={() => (active = i)}
          onclick={() => (active = i)}
        />
        {#if i % labelEvery === (periods.length - 1) % labelEvery}
          <text x={x + barW / 2} y={H - 5} text-anchor="middle" class="fill-slate-500 text-[10px]">{p.label}</text>
        {/if}
      {/each}
    </svg>
  </section>

  <section class="mx-4 mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900">
    <div class="flex items-baseline justify-between">
      <h2 class="font-semibold">By category</h2>
      {#if focus !== null}
        <button class="text-sm font-medium text-brand-600" onclick={() => toggleFocus(focus!)}>Show all</button>
      {:else}
        <span class="text-xs text-slate-500">Tap one to dig in</span>
      {/if}
    </div>
    <ul class="mt-3 flex flex-col gap-1">
      {#each categories as c (c.category)}
        <li>
          <button
            class="w-full rounded-xl px-2 py-2 text-left {focus === c.category ? 'bg-brand-50 dark:bg-brand-700/20' : ''} {focus !== null && focus !== c.category ? 'opacity-50' : ''}"
            aria-pressed={focus === c.category}
            onclick={() => toggleFocus(c.category)}
          >
            <span class="flex items-baseline justify-between gap-2 text-sm">
              <span class="min-w-0 truncate">{catEmoji(c.category)} {catName(c.category)}</span>
              <span class="shrink-0 tabular-nums">
                <b>{formatCents(c.cents)}</b>
                <span class="text-slate-500">· {Math.round(c.share * 100)}%</span>
              </span>
            </span>
            <span class="mt-1.5 block h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
              <span
                class="block h-2 rounded-full bg-brand-600"
                style="width: {Math.max(1, (c.cents / categories[0].cents) * 100)}%"
              ></span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </section>

  <section class="mt-4 mb-4">
    <h2 class="px-5 pb-1 font-semibold">Biggest expenses{focus !== null ? ` · ${catName(focus)}` : ''}</h2>
    <div class="divide-y divide-slate-100 dark:divide-slate-800">
      {#each biggest as e (e.id)}
        <button class="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-100 dark:active:bg-slate-800" onclick={() => editExpense(e)}>
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-800">{catEmoji(e.category)}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{e.description}</span>
            <span class="block text-sm text-slate-500">{app.nameOf(e.paid_by)} paid · {shortDate(e.date)}</span>
          </span>
          <span class="shrink-0 font-semibold">{formatCents(e.amount_cents)}</span>
        </button>
      {/each}
    </div>
  </section>
{/if}
