<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from './lib/state.svelte';
  import type { Expense, Recurring, Settlement } from './lib/pb';
  import Login from './components/Login.svelte';
  import Home from './components/Home.svelte';
  import History from './components/History.svelte';
  import Settings from './components/Settings.svelte';
  import Stats from './components/Stats.svelte';
  import ExpenseForm from './components/ExpenseForm.svelte';
  import SettleForm from './components/SettleForm.svelte';
  import Sheet from './components/Sheet.svelte';

  type Tab = 'home' | 'history' | 'stats' | 'settings';
  let tab = $state<Tab>('home');

  // which sheet is open; `null` item means "new"
  let expenseSheet = $state<{ item: Expense | null } | null>(null);
  let settleSheet = $state<{ item: Settlement | null } | null>(null);
  let recurringSheet = $state<Recurring | null>(null);

  onMount(() => {
    if (app.me) app.start();
    const onVisible = () => document.visibilityState === 'visible' && app.me && app.reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  });

  const actions = {
    addExpense: () => (expenseSheet = { item: null }),
    editExpense: (item: Expense) => (expenseSheet = { item }),
    settle: () => (settleSheet = { item: null }),
    editSettlement: (item: Settlement) => (settleSheet = { item }),
    showHistory: () => (tab = 'history'),
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z' },
    { id: 'history', label: 'History', icon: 'M4 6h16M4 12h16M4 18h10' },
    { id: 'stats', label: 'Stats', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z' },
  ];
</script>

{#if !app.me}
  <Login />
{:else}
  <div class="mx-auto flex min-h-dvh max-w-md flex-col pb-[calc(5rem+env(safe-area-inset-bottom))]">
    {#if app.error}
      <div class="mx-4 mt-3 rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
        {app.error}
      </div>
    {/if}

    {#if tab === 'home'}
      <Home {...actions} />
    {:else if tab === 'history'}
      <History {...actions} />
    {:else if tab === 'stats'}
      <Stats editExpense={actions.editExpense} />
    {:else}
      <Settings editRecurring={(r) => (recurringSheet = r)} />
    {/if}
  </div>

  <nav
    class="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
  >
    <div class="mx-auto flex max-w-md">
      {#each tabs as t (t.id)}
        <button
          class="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium {tab === t.id
            ? 'text-brand-600'
            : 'text-slate-500'}"
          onclick={() => (tab = t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
            <path d={t.icon} />
          </svg>
          {t.label}
        </button>
      {/each}
    </div>
  </nav>

  {#if expenseSheet}
    <Sheet onclose={() => (expenseSheet = null)} title={expenseSheet.item ? 'Edit expense' : 'Add expense'}>
      <ExpenseForm expense={expenseSheet.item} onclose={() => (expenseSheet = null)} />
    </Sheet>
  {/if}

  {#if recurringSheet}
    <Sheet onclose={() => (recurringSheet = null)} title="Repeating expense">
      <ExpenseForm template={recurringSheet} onclose={() => (recurringSheet = null)} />
    </Sheet>
  {/if}

  {#if settleSheet}
    <Sheet onclose={() => (settleSheet = null)} title={settleSheet.item ? 'Payment' : 'Settle up'}>
      <SettleForm settlement={settleSheet.item} onclose={() => (settleSheet = null)} />
    </Sheet>
  {/if}
{/if}
