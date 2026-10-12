import type { DataSource } from './DataSource';
import { HttpDataSource } from './httpDataSource';
import { LocalDataSource } from './localDataSource';

export type { DataSource };

/** Selects the data source from env; defaults to the local mock. */
export function createDataSource(): DataSource {
  if (import.meta.env.VITE_DATA_SOURCE === 'http' && import.meta.env.VITE_API_URL) {
    return new HttpDataSource(import.meta.env.VITE_API_URL);
  }
  return new LocalDataSource();
}
