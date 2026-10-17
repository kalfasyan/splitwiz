<script lang="ts">
  import { app } from '../lib/state.svelte';
  import { formatCents } from '../lib/money';
  import { pb } from '../lib/pb';

  type Result = {
    people: [string, string];
    users: [string, string];
    expenses: number;
    settlements: number;
    first: string;
    last: string;
    already: number;
    net: Record<string, number>;
    categories: Record<string, number>;
    imported: number;
  };

  let file = $state<File | null>(null);
  let preview = $state<Result | null>(null);
  let users = $state<[string, string]>(['', '']);
  let done = $state<Result | null>(null);
  let busy = $state(false);
  let error = $state('');

  async function send(confirm: boolean): Promise<Result> {
    const body = new FormData();
    body.append('file', file!);
    if (users[0]) {
      body.append('user0', users[0]);
      body.append('user1', users[1]);
    }
    if (confirm) body.append('confirm', '1');
    return pb.send<Result>('/api/splitwiz/import/splitwise', { method: 'POST', body });
  }

  async function pick(e: Event) {
    file = (e.target as HTMLInputElement).files?.[0] ?? null;
    preview = done = null;
    users = ['', ''];
    error = '';
    if (!file) return;
    busy = true;
    try {
      preview = await send(false);
      users = preview.users;
    } catch (err) {
      error = (err as { message?: string }).message ?? 'Could not read the file.';
    } finally {
      busy = false;
    }
  }

  // picking one person decides the other
  function assign(i: 0 | 1, id: string) {
    const other = app.users.find((u) => u.id !== id)?.id ?? '';
    users = i === 0 ? [id, other] : [other, id];
    refresh();
  }

  async function refresh() {
    busy = true;
    try {
      preview = await send(false);
    } finally {
      busy = false;
    }
  }

  async function run() {
    busy = true;
    error = '';
    try {
      done = await send(true);
      preview = null;
      await app.reload();
    } catch (err) {
      error = (err as { message?: string }).message ?? 'Import failed.';
    } finally {
      busy = false;
    }
  }

  const balanceLine = (r: Result) => {
    const [a, b] = r.users;
    const owed = r.net[a] > 0 ? a : b;
    const owes = owed === a ? b : a;
    if (!r.net[a]) return 'The export ends settled.';
    return `It ends with ${app.nameOf(owes)} owing ${app.nameOf(owed) === 'You' ? 'you' : app.nameOf(owed)} ${formatCents(Math.abs(r.net[a]))}.`;
  };
</script>

<section class="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
  <h2 class="font-semibold">Import from Splitwise</h2>
  <p class="text-sm text-slate-500">
    In Splitwise, open your group, then Settings › Export as spreadsheet, and pick that CSV here. Importing the same file
    again adds only what’s new.
  </p>
  <input type="file" accept=".csv,text/csv" onchange={pick} disabled={busy} />

  {#if busy && !preview}<p class="text-sm text-slate-500">Reading…</p>{/if}

  {#if preview}
    <div class="flex flex-col gap-2 text-sm">
      {#each preview.people as person, i (i)}
        <label class="flex items-center justify-between gap-2">
          <span class="min-w-0 truncate">“{person}” is</span>
          <select class="py-2" value={users[i]} onchange={(e) => assign(i as 0 | 1, (e.target as HTMLSelectElement).value)}>
            {#each app.users as u (u.id)}
              <option value={u.id}>{app.nameOf(u.id)}</option>
            {/each}
          </select>
        </label>
      {/each}
      <p>
        {preview.expenses} expenses and {preview.settlements} payments from {preview.first} to {preview.last}.
        {#if preview.already}{preview.already} were imported before and are skipped.{/if}
      </p>
      <p>{balanceLine(preview)}</p>
    </div>
    {#if preview.expenses + preview.settlements > 0}
      <button class="btn-primary" onclick={run} disabled={busy}>
        {busy ? 'Importing…' : `Import ${preview.expenses + preview.settlements} entries`}
      </button>
    {:else}
      <p class="text-sm text-slate-500">Everything in this file is already in Splitwiz.</p>
    {/if}
  {/if}

  {#if done}
    <p class="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
      Imported {done.imported} entries. {balanceLine(done)}
    </p>
  {/if}
  {#if error}<p class="text-sm text-red-600">{error}</p>{/if}
</section>
