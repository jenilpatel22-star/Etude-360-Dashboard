import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cx } from '@/lib/format';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  /** Value used for sorting (and default rendering). */
  value?: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  className?: string;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Text used by the search box; omit to hide search. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  toolbar?: ReactNode;
  emptyMessage?: string;
  caption: string;
  rowClassName?: (row: T) => string | undefined;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = 'Search…',
  pageSize = 10,
  initialSort,
  toolbar,
  emptyMessage = 'No records match the current filters.',
  caption,
  rowClassName,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows;
  }, [rows, query, searchText]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.value!(a);
      const vb = col.value!(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * dir;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(0);
  };

  return (
    <div>
      {(searchText || toolbar) && (
        <div className="mb-3 flex flex-wrap items-center gap-2" data-export-ignore>
          {searchText && (
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" aria-hidden />
              <input
                type="search"
                className="input pl-8"
                placeholder={searchPlaceholder}
                aria-label={`Search ${caption}`}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          )}
          {toolbar}
        </div>
      )}
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const sortable = c.sortable !== false && !!c.value;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={cx('th', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.hideOnMobile && 'hidden md:table-cell')}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cx('inline-flex items-center gap-1 uppercase hover:text-stone-900 dark:hover:text-stone-100', c.align === 'right' && 'flex-row-reverse')}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                className={cx('border-b border-stone-100 last:border-0 hover:bg-stone-50 dark:border-stone-800/60 dark:hover:bg-stone-800/40', rowClassName?.(row))}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cx('td', c.align === 'right' && 'text-right tabular-nums', c.align === 'center' && 'text-center', c.hideOnMobile && 'hidden md:table-cell', c.className)}
                  >
                    {c.render ? c.render(row) : (c.value?.(row) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <EmptyState title={emptyMessage} />}
      </div>
      {sorted.length > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs muted" data-export-ignore>
          <span className="tabular-nums">
            {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" className="btn-ghost p-1.5" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">
              Page {current + 1} / {pageCount}
            </span>
            <button type="button" className="btn-ghost p-1.5" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
