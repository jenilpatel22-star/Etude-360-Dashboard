import seed from '../seed.json';
import type { CollectionName, Dataset, EntityOf, ID } from '@/types';
import type { DataSource } from './DataSource';

const STORAGE_KEY = 'etude.dataset.v1';

const PREFIX: Record<CollectionName, string> = {
  programs: 'PRG',
  activities: 'ACT',
  logistics: 'LOG',
  phases: 'PH',
  feedback: 'FB',
  feedback360: 'F360',
  staff: 'S',
  participants: 'P',
};

function freshSeed(): Dataset {
  // structuredClone keeps the imported JSON module pristine
  const { programs, activities, logistics, phases, feedback, feedback360, staff, participants } = structuredClone(
    seed,
  ) as unknown as Dataset;
  return { programs, activities, logistics, phases, feedback, feedback360, staff, participants };
}

function newId(collection: CollectionName) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${PREFIX[collection]}-${Date.now().toString(36).toUpperCase()}${rand}`;
}

/** Simulated network latency so loading states are exercised. */
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

/**
 * Mock backend: seed JSON + edits persisted to localStorage.
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
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw ? (JSON.parse(raw) as Dataset) : freshSeed();
    } catch {
      this.data = freshSeed();
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

  async reset(): Promise<Dataset> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    this.data = freshSeed();
    return structuredClone(this.data);
  }
}
