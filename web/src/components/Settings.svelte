<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { pb } from '../lib/pb';

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

  <section class="flex flex-col gap-3">
    <button class="btn-secondary" onclick={exportCsv}>Export all data (CSV)</button>
    <button class="btn-secondary text-red-600" onclick={() => app.logout()}>Sign out</button>
  </section>

  <p class="text-center text-xs text-slate-400">Splitwiz · running on your NAS</p>
</div>
