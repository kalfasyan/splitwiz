import { pb, type Category, type Expense, type Settlement, type Summary, type User } from './pb';

export type Entry =
  | { kind: 'expense'; date: string; created: string; item: Expense }
  | { kind: 'settlement'; date: string; created: string; item: Settlement };

class AppState {
  me = $state<User | null>(pb.authStore.isValid ? (pb.authStore.record as unknown as User) : null);
  users = $state<User[]>([]);
  categories = $state<Category[]>([]);
  expenses = $state<Expense[]>([]);
  settlements = $state<Settlement[]>([]);
  summary = $state<Summary | null>(null);
  loading = $state(false);
  error = $state('');

  entries = $derived<Entry[]>(
    [
      ...this.expenses.map((e) => ({ kind: 'expense' as const, date: e.date, created: e.created, item: e })),
      ...this.settlements.map((s) => ({ kind: 'settlement' as const, date: s.date, created: s.created, item: s })),
    ].sort((a, b) => (a.date === b.date ? b.created.localeCompare(a.created) : b.date.localeCompare(a.date))),
  );

  other = $derived<User | undefined>(this.users.find((u) => u.id !== this.me?.id));

  private unsubscribers: (() => void)[] = [];
  private reloadTimer: ReturnType<typeof setTimeout> | undefined;

  nameOf(id: string): string {
    if (id === this.me?.id) return 'You';
    const u = this.users.find((x) => x.id === id);
    return u?.name || u?.email || 'Partner';
  }

  category(id: string): Category | undefined {
    return this.categories.find((c) => c.id === id);
  }

  async login(email: string, password: string) {
    const res = await pb.collection('users').authWithPassword(email, password);
    this.me = res.record as unknown as User;
    await this.start();
  }

  logout() {
    this.stop();
    pb.authStore.clear();
    this.me = null;
  }

  async start() {
    await this.reload();
    this.stop();
    for (const name of ['expenses', 'settlements']) {
      this.unsubscribers.push(await pb.collection(name).subscribe('*', () => this.scheduleReload()));
    }
  }

  stop() {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
  }

  scheduleReload() {
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => this.reload(), 150);
  }

  async reload() {
    if (!pb.authStore.isValid) return;
    this.loading = true;
    try {
      const [users, categories, expenses, settlements, summary] = await Promise.all([
        pb.collection('users').getFullList<User>({ sort: 'created' }),
        pb.collection('categories').getFullList<Category>({ sort: 'sort,name' }),
        pb.collection('expenses').getFullList<Expense>({ sort: '-date,-created' }),
        pb.collection('settlements').getFullList<Settlement>({ sort: '-date,-created' }),
        pb.send<Summary>('/api/splitwiz/summary', {}),
      ]);
      this.users = users;
      this.categories = categories;
      this.expenses = expenses;
      this.settlements = settlements;
      this.summary = summary;
      this.error = '';
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        this.logout();
      } else {
        this.error = 'Could not reach the NAS. Showing the last data loaded.';
      }
    } finally {
      this.loading = false;
    }
  }
}

export const app = new AppState();
