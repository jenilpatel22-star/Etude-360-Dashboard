import type { CollectionName, Dataset, EntityOf, ID } from '@/types';
import type { DataSource } from './DataSource';

/**
 * Example REST implementation. Point VITE_API_URL at a backend exposing:
 *   GET    /:collection          → EntityOf<C>[]
 *   POST   /:collection          → EntityOf<C>
 *   PATCH  /:collection/:id      → EntityOf<C>
 *   DELETE /:collection/:id
 * then set VITE_DATA_SOURCE=http.
 */
export class HttpDataSource implements DataSource {
  constructor(private baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  async load(): Promise<Dataset> {
    // Accounts are deliberately not listed: with a real backend, authentication
    // (login, password hashing, sessions) must run server-side.
    const names: CollectionName[] = ['programs', 'activities', 'logistics', 'phases', 'feedback', 'feedback360', 'staff', 'participants'];
    const lists = await Promise.all(names.map((n) => this.request<unknown[]>(`/${n}`)));
    return { accounts: [], ...Object.fromEntries(names.map((n, i) => [n, lists[i]])) } as unknown as Dataset;
  }

  create<C extends CollectionName>(collection: C, item: Omit<EntityOf<C>, 'id'>) {
    return this.request<EntityOf<C>>(`/${collection}`, { method: 'POST', body: JSON.stringify(item) });
  }

  update<C extends CollectionName>(collection: C, id: ID, patch: Partial<EntityOf<C>>) {
    return this.request<EntityOf<C>>(`/${collection}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  }

  remove(collection: CollectionName, id: ID) {
    return this.request<void>(`/${collection}/${id}`, { method: 'DELETE' });
  }

  async reset() {
    return this.load();
  }
}
