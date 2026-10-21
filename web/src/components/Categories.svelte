<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { formatCents, parseAmount } from '../lib/money';
  import type { Category } from '../lib/pb';

  // id being edited; 'new' while adding one
  let editing = $state('');
  let emoji = $state('');
  let name = $state('');
  let limitText = $state('');
  let busy = $state(false);
  let error = $state('');

  const limit = $derived(limitText.trim() ? parseAmount(limitText) : 0);
  const valid = $derived(!!name.trim() && limit !== null);

  function open(c: Category | null) {
    editing = c?.id ?? 'new';
    emoji = c?.emoji ?? '';
    name = c?.name ?? '';
    limitText = c?.monthly_cents ? String(c.monthly_cents / 100) : '';
    error = '';
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!valid) return;
    busy = true;
    error = '';
    const data = { emoji: emoji.trim(), name: name.trim(), monthly_cents: limit ?? 0 };
    try {
      if (editing === 'new') {
        const sort = Math.max(-1, ...app.categories.map((c) => c.sort)) + 1;
        await app.write('categories', 'create', null, { ...data, sort });
      } else {
        await app.write('categories', 'update', editing, data);
      }
      editing = '';
    } catch (err) {
      const msg = (err as { response?: { data?: { name?: { code?: string } } }; message?: string });
      error = msg.response?.data?.name?.code === 'validation_not_unique' ? 'There is already a category with that name.' : (msg.message ?? 'Could not save.');
    } finally {
      busy = false;
    }
  }

  // moves a category up or down, renumbering the order where it changed
  async function move(i: number, by: number) {
    const order = [...app.categories];
    const j = i + by;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    busy = true;
    try {
      for (const [at, c] of order.entries()) {
        if (c.sort !== at) await app.write('categories', 'update', c.id, { sort: at });
      }
    } finally {
      busy = false;
    }
  }

  function remove(c: Category) {
    editing = '';
    app.remove('categories', c.id, `Deleted “${c.name}”. Its expenses stay, without a category.`);
  }
</script>

{#snippet editor(c: Category | null, i: number)}
  <form class="flex flex-col gap-2 px-4 py-3" onsubmit={save}>
    <div class="flex gap-2">
      <input class="w-16 text-center" placeholder="🙂" aria-label="Emoji" maxlength="16" bind:value={emoji} />
      <input class="min-w-0 flex-1" placeholder="Name" aria-label="Name" maxlength="50" bind:value={name} />
    </div>
    <div class="flex items-center gap-2 text-sm">
      <span class="whitespace-nowrap text-slate-500">Monthly limit €</span>
      <input class="min-w-0 flex-1 py-2" inputmode="decimal" placeholder="none" aria-label="Monthly limit" bind:value={limitText} />
    </div>
    {#if limit}
      <p class="text-xs text-slate-500">Stats shows how much is left, and you both get a notification at 90%.</p>
    {/if}
    {#if error}<p class="text-sm text-red-600">{error}</p>{/if}
    <div class="flex items-center gap-2">
      <button class="btn-primary px-4 py-2" disabled={busy || !valid}>Save</button>
      <button type="button" class="px-2 text-sm text-slate-500" onclick={() => (editing = '')}>Cancel</button>
      {#if c}
        <span class="flex-1"></span>
        <button type="button" class="chip px-3" aria-label="Move up" disabled={busy || i === 0} onclick={() => move(i, -1)}>↑</button>
        <button type="button" class="chip px-3" aria-label="Move down" disabled={busy || i === app.categories.length - 1} onclick={() => move(i, 1)}>↓</button>
        <button type="button" class="px-2 text-sm font-medium text-red-600" onclick={() => remove(c)}>Delete</button>
      {/if}
    </div>
  </form>
{/snippet}

<section class="flex flex-col gap-2">
  <h2 class="px-1 font-semibold">Categories</h2>
  <div class="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
    {#each app.categories as c, i (c.id)}
      {#if editing === c.id}
        {@render editor(c, i)}
      {:else}
        <button class="flex w-full items-center gap-3 px-4 py-3 text-left" onclick={() => open(c)}>
          <span class="w-6 text-center text-lg">{c.emoji || '·'}</span>
          <span class="min-w-0 flex-1 truncate font-medium">{c.name}</span>
          {#if c.monthly_cents}<span class="shrink-0 text-sm text-slate-500">{formatCents(c.monthly_cents)} a month</span>{/if}
        </button>
      {/if}
    {/each}
    {#if editing === 'new'}
      {@render editor(null, -1)}
    {:else}
      <button class="w-full px-4 py-3 text-left text-sm font-medium text-brand-600" onclick={() => open(null)}>+ Add category</button>
    {/if}
  </div>
</section>
