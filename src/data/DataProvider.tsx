import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CollectionName, Dataset, EntityOf, ID } from '@/types';
import { createDataSource, type DataSource } from './sources';

interface DataContextValue {
  data: Dataset;
  loading: boolean;
  error: string | null;
  create<C extends CollectionName>(collection: C, item: Omit<EntityOf<C>, 'id'>): Promise<EntityOf<C>>;
  update<C extends CollectionName>(collection: C, id: ID, patch: Partial<EntityOf<C>>): Promise<EntityOf<C>>;
  remove(collection: CollectionName, id: ID): Promise<void>;
  reset(): Promise<void>;
}

const EMPTY: Dataset = {
  accounts: [],
  programs: [],
  activities: [],
  logistics: [],
  phases: [],
  feedback: [],
  feedback360: [],
  staff: [],
  participants: [],
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children, source }: { children: ReactNode; source?: DataSource }) {
  const sourceRef = useRef<DataSource>(source ?? createDataSource());
  const [data, setData] = useState<Dataset>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    sourceRef.current
      .load()
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(async <C extends CollectionName>(collection: C, item: Omit<EntityOf<C>, 'id'>) => {
    const created = await sourceRef.current.create(collection, item);
    setData((d) => ({ ...d, [collection]: [...d[collection], created] }));
    return created;
  }, []);

  const update = useCallback(async <C extends CollectionName>(collection: C, id: ID, patch: Partial<EntityOf<C>>) => {
    const updated = await sourceRef.current.update(collection, id, patch);
    setData((d) => ({
      ...d,
      [collection]: (d[collection] as EntityOf<C>[]).map((x) => (x.id === id ? updated : x)),
    }));
    return updated;
  }, []);

  const remove = useCallback(async (collection: CollectionName, id: ID) => {
    await sourceRef.current.remove(collection, id);
    // reload to pick up cascades performed by the source
    setData(await sourceRef.current.load());
  }, []);

  const reset = useCallback(async () => {
    setData(await sourceRef.current.reset());
  }, []);

  const value = useMemo(
    () => ({ data, loading, error, create, update, remove, reset }),
    [data, loading, error, create, update, remove, reset],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

/** Lookup helpers derived from the dataset. */
export function useLookups() {
  const { data } = useData();
  return useMemo(() => {
    const staffById = new Map(data.staff.map((s) => [s.id, s]));
    const programById = new Map(data.programs.map((p) => [p.id, p]));
    return {
      staffById,
      programById,
      staffName: (id: ID) => staffById.get(id)?.name ?? 'Unassigned',
      trainers: data.staff.filter((s) => s.role === 'Trainer'),
    };
  }, [data.staff, data.programs]);
}
