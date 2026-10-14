import type { CollectionName, Dataset, EntityOf, ID } from '@/types';

/**
 * Abstraction over where data lives. The UI only talks to this interface
 * (through DataProvider), so swapping the local mock for a real REST/GraphQL
 * backend means implementing these five methods — nothing else changes.
 */
export interface DataSource {
  /** Load the full dataset (small enough for a dashboard; paginate per collection in a real API). */
  load(): Promise<Dataset>;
  create<C extends CollectionName>(collection: C, item: Omit<EntityOf<C>, 'id'>): Promise<EntityOf<C>>;
  update<C extends CollectionName>(collection: C, id: ID, patch: Partial<EntityOf<C>>): Promise<EntityOf<C>>;
  remove(collection: CollectionName, id: ID): Promise<void>;
  /** Apply many writes to one collection at once (e.g. a spreadsheet import). */
  bulk<C extends CollectionName>(
    collection: C,
    ops: { create?: Omit<EntityOf<C>, 'id'>[]; update?: { id: ID; patch: Partial<EntityOf<C>> }[]; remove?: ID[] },
  ): Promise<void>;
  /** Delete all data, including accounts (Admin only). */
  reset(): Promise<Dataset>;
}
