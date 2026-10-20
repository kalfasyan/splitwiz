<script lang="ts">
  import { app } from '../lib/state.svelte';
</script>

{#if app.toast}
  {@const t = app.toast}
  <div
    class="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md px-4"
    role="status"
    aria-live="polite"
  >
    <div class="flex w-full items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
      <span class="min-w-0 flex-1">{t.message}</span>
      {#if t.undo}
        <button
          class="shrink-0 font-semibold text-brand-500 dark:text-brand-700"
          onclick={() => {
            t.undo?.();
            app.toast = null;
          }}
        >
          Undo
        </button>
      {/if}
    </div>
  </div>
{/if}
