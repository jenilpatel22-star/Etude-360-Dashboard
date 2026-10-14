import type { CollectionName, Dataset, EntityOf, ID } from '@/types';
import type { DataSource } from './DataSource';

const STORAGE_KEY = 'etude.dataset.v3';
/** Keys used by earlier versions that held sample data; removed on load. */
const LEGACY_KEYS = ['etude.dataset.v1', 'etude.dataset.v2', 'etude.currentProgram'];

const PREFIX: Record<CollectionName, string> = {
  accounts: 'U',
  depository: 'DEP',
  programs: 'PRG',
  activities: 'ACT',
  logistics: 'LOG',
  phases: 'PH',
  feedback: 'FB',
  feedback360: 'F360',
  staff: 'S',
  participants: 'P',
};

export function emptyDataset(): Dataset {
  return {
    accounts: [],
    depository: [],
    programs: [],
    activities: [],
    logistics: [],
    phases: [],
    feedback: [],
    feedback360: [],
    staff: [],
    participants: [],
  };
}

function newId(collection: CollectionName) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${PREFIX[collection]}-${Date.now().toString(36).toUpperCase()}${rand}`;
}

/** Simulated network latency so loading states are exercised. */
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

/**
 * Browser-only backend: data persisted to localStorage, starting empty.
 * Behaves like an async API so it can be replaced 1:1 by HttpDataSource.
 */
export class LocalDataSource implements DataSource {
  private data: Dataset | null = null;

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or unavailable — keep in-memory state */
    }
  }

  private get db(): Dataset {
    if (!this.data) throw new Error('DataSource not loaded');
    return this.data;
  }

  async load(): Promise<Dataset> {
    await delay();
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw ? { ...emptyDataset(), ...(JSON.parse(raw) as Partial<Dataset>) } : emptyDataset();
    } catch {
      this.data = emptyDataset();
    }
    return structuredClone(this.data);
  }

  async create<C extends CollectionName>(collection: C, item: Omit<EntityOf<C>, 'id'>): Promise<EntityOf<C>> {
    await delay(60);
    const created = { ...item, id: newId(collection) } as EntityOf<C>;
    (this.db[collection] as EntityOf<C>[]).push(created);
    this.persist();
    return structuredClone(created);
  }

  async update<C extends CollectionName>(collection: C, id: ID, patch: Partial<EntityOf<C>>): Promise<EntityOf<C>> {
    await delay(60);
    const list = this.db[collection] as EntityOf<C>[];
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error(`${collection}/${id} not found`);
    list[idx] = { ...list[idx], ...patch, id };
    this.persist();
    return structuredClone(list[idx]);
  }

  async remove(collection: CollectionName, id: ID): Promise<void> {
    await delay(60);
    const list = this.db[collection] as { id: ID }[];
    const idx = list.findIndex((x) => x.id === id);
    if (idx !== -1) list.splice(idx, 1);
    if (collection === 'programs') {
      // cascade: drop dependent records
      for (const c of ['activities', 'logistics', 'phases', 'feedback', 'feedback360'] as const) {
        (this.db[c] as { programId: ID }[]) = (this.db[c] as { programId: ID }[]).filter((x) => x.programId !== id) as never;
      }
    }
    this.persist();
  }

  async bulk<C extends CollectionName>(
    collection: C,
    ops: { create?: Omit<EntityOf<C>, 'id'>[]; update?: { id: ID; patch: Partial<EntityOf<C>> }[]; remove?: ID[] },
  ): Promise<void> {
    await delay(60);
    const list = this.db[collection] as EntityOf<C>[];
    const removeIds = new Set(ops.remove ?? []);
    const next = list.filter((x) => !removeIds.has(x.id));
    for (const u of ops.update ?? []) {
      const idx = next.findIndex((x) => x.id === u.id);
      if (idx !== -1) next[idx] = { ...next[idx], ...u.patch, id: u.id };
    }
    for (const c of ops.create ?? []) next.push({ ...c, id: newId(collection) } as EntityOf<C>);
    (this.db[collection] as EntityOf<C>[]) = next;
    this.persist();
  }

  async reset(): Promise<Dataset> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    this.data = emptyDataset();
    return structuredClone(this.data);
  }
}
