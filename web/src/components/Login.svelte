<script lang="ts">
  import { app } from '../lib/state.svelte';

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let error = $state('');

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      await app.login(email.trim(), password);
    } catch {
      error = 'Wrong email or password.';
    } finally {
      busy = false;
    }
  }
</script>

<main class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
  <img src="/icons/icon-192.png" alt="" class="mx-auto mb-4 h-20 w-20" />
  <h1 class="mb-1 text-center text-3xl font-bold">Splitwiz</h1>
  <p class="mb-8 text-center text-slate-500">Shared expenses, simply.</p>
  <form class="flex flex-col gap-3" onsubmit={submit}>
    <input type="email" autocomplete="username" placeholder="Email" bind:value={email} required />
    <input type="password" autocomplete="current-password" placeholder="Password" bind:value={password} required />
    {#if error}<p class="text-sm text-red-600">{error}</p>{/if}
    <button class="btn-primary mt-2" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </form>
</main>
