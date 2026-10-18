<script lang="ts">
  import { formatCents } from '../lib/money';
  import type { MonthOutlook } from '../lib/budget';
  import { niceTicks } from '../lib/stats';

  let { outlook, budget }: { outlook: MonthOutlook; budget: number } = $props();

  const compact = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });
  const short = (cents: number) => compact.format(cents / 100);
  const monthName = $derived(new Date(outlook.month + '-15T12:00:00').toLocaleDateString(undefined, { month: 'short' }));

  // geometry in viewBox units, like PeriodBars
  const W = 340;
  const H = 160;
  const top = 12;
  const bottom = 20;
  const left = 34;
  const right = 14;
  const ticks = $derived(niceTicks(Math.max(outlook.spent, outlook.projected, budget)));
  const yMax = $derived(ticks.at(-1) || 1);
  // day 0 is the start of the 1st, day n the end of the nth
  const x = (day: number) => left + ((W - left - right) * day) / outlook.days;
  const y = (cents: number) => top + (H - top - bottom) * (1 - cents / yMax);

  const actual = $derived([[0, 0], ...outlook.cumulative.map((c, i) => [i + 1, c])]);
  const ahead = $derived([[outlook.day, outlook.spent], ...outlook.projection.map((c, i) => [outlook.day + i, c])]);
  const path = (pts: number[][]) => pts.map(([d, c], i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(c).toFixed(1)}`).join('');
  const area = $derived(`${path(actual)}V${y(0)}H${x(0)}Z`);
  const over = $derived(budget > 0 && outlook.projected > budget);
  const labels = $derived([1, 10, 20, outlook.days]);
</script>

<svg
  viewBox="0 0 {W} {H}"
  class="mt-3 w-full"
  role="img"
  aria-label="Spent {formatCents(outlook.spent)} by day {outlook.day}, heading for {formatCents(outlook.projected)} by day {outlook.days}{budget
    ? `, budget ${formatCents(budget)}`
    : ''}"
>
  {#each ticks as t (t)}
    <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} class="stroke-slate-200 dark:stroke-slate-800" stroke-width="1" />
    <text x={left - 6} y={y(t) + 4} text-anchor="end" class="fill-slate-400 text-[10px]">{short(t)}</text>
  {/each}

  <path d={area} class="fill-brand-500/15" />
  <path d={path(actual)} fill="none" class="stroke-brand-600" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
  <path
    d={path(ahead)}
    fill="none"
    class={over ? 'stroke-orange-500' : 'stroke-brand-600/60'}
    stroke-width="2"
    stroke-dasharray="4 4"
    stroke-linejoin="round"
    stroke-linecap="round"
  />

  {#if budget > 0}
    <line x1={left} x2={W - right} y1={y(budget)} y2={y(budget)} class="stroke-slate-500 dark:stroke-slate-400" stroke-width="1.5" stroke-dasharray="1 3" stroke-linecap="round" />
    <text x={left + 4} y={y(budget) - 4} class="fill-slate-500 text-[10px] font-medium dark:fill-slate-400">Budget</text>
  {/if}

  <circle cx={x(outlook.day)} cy={y(outlook.spent)} r="4" class="fill-brand-600 stroke-white dark:stroke-slate-900" stroke-width="2" />
  <circle cx={x(outlook.days)} cy={y(outlook.projected)} r="3" class={over ? 'fill-orange-500' : 'fill-brand-600/60'} />

  {#each labels as d, i (d)}
    <text
      x={x(d - 0.5)}
      y={H - 5}
      text-anchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
      class="fill-slate-500 text-[10px]">{i === 0 ? `${d} ${monthName}` : d}</text
    >
  {/each}
</svg>
