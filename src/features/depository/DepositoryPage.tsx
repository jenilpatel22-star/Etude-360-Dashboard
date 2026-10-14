import { CheckSquare, ChevronDown, Download, FileSpreadsheet, FileText, Library, Search, Square, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tag } from '@/components/ui/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/data/DataProvider';
import { downloadChecklistPdf, downloadChecklistXlsx, downloadTemplate } from '@/lib/depository';
import { formatDate } from '@/lib/dates';
import { cx } from '@/lib/format';
import type { DepositoryActivity, ID } from '@/types';
import { ImportDialog } from './ImportDialog';

/** Each user's on-screen ticks, kept in this browser. They carry into the downloaded checklist. */
function useTicks(accountId: string | undefined) {
  const key = `etude.depositoryTicks.${accountId ?? 'anon'}`;
  const [ticks, setTicks] = useState<Set<ID>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as ID[]);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...ticks]));
    } catch {
      /* ignore */
    }
  }, [key, ticks]);
  const toggle = useCallback((id: ID) => setTicks((t) => {
    const n = new Set(t);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  }), []);
  const clear = useCallback((ids: ID[]) => setTicks((t) => {
    const n = new Set(t);
    ids.forEach((i) => n.delete(i));
    return n;
  }), []);
  return { ticks, toggle, clear };
}

function DownloadButtons({ acts, onDownload, label, compact }: { acts: DepositoryActivity[]; onDownload: (fmt: 'xlsx' | 'pdf', acts: DepositoryActivity[]) => void; label: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <button type="button" className={cx('btn-secondary', compact && 'px-2 py-1 text-xs')} disabled={!acts.length} onClick={() => onDownload('xlsx', acts)} title="Download as Excel">
        <FileSpreadsheet className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden /> Excel
      </button>
      <button type="button" className={cx('btn-secondary', compact && 'px-2 py-1 text-xs')} disabled={!acts.length} onClick={() => onDownload('pdf', acts)} title="Download as PDF">
        <FileText className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden /> PDF
      </button>
    </div>
  );
}

export default function DepositoryPage() {
  const { data, remove, bulk } = useData();
  const { account, can } = useAuth();
  const { ticks, toggle, clear } = useTicks(account?.id);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState<Set<ID>>(new Set());
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const all = useMemo(() => [...data.depository].sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name, undefined, { numeric: true })), [data.depository]);
  const categories = useMemo(() => [...new Set(all.map((a) => a.category).filter(Boolean))].sort(), [all]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (a) =>
        (!category || a.category === category) &&
        (!q || [a.code, a.name, a.category, a.description, ...a.items.flatMap((i) => [i.name, i.responsible, i.notes])].join(' ').toLowerCase().includes(q)),
    );
  }, [all, query, category]);

  const itemTotal = all.reduce((s, a) => s + a.items.length, 0);
  const latest = all.reduce<DepositoryActivity | null>((m, a) => (!m || a.importedAt > m.importedAt ? a : m), null);

  const onDownload = async (fmt: 'xlsx' | 'pdf', acts: DepositoryActivity[]) => {
    setBusy(fmt);
    setNotice(null);
    try {
      const ctx = { preparedFor: `${account?.displayName ?? ''} (${account?.role ?? ''})`, ticked: ticks };
      if (fmt === 'xlsx') await downloadChecklistXlsx(acts, ctx);
      else await downloadChecklistPdf(acts, ctx);
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const toggleOpen = (id: ID) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <PageHeader
        title="Activity depository"
        subtitle={
          all.length
            ? `${all.length} activities · ${itemTotal} items${latest ? ` · last import ${formatDate(latest.importedAt.slice(0, 10))} from ${latest.sourceFile}${latest.importedBy ? ` by ${latest.importedBy}` : ''}` : ''}`
            : 'Standard activities and the items each one needs, imported from Excel'
        }
        actions={
          can.manageDepository && (
            <>
              <button type="button" className="btn-secondary" onClick={() => void downloadTemplate().catch((e: Error) => setNotice({ tone: 'error', text: e.message }))}>
                <Download className="h-4 w-4" aria-hidden /> Template
              </button>
              <button type="button" className="btn-primary" onClick={() => setImporting(true)}>
                <Upload className="h-4 w-4" aria-hidden /> Import from Excel
              </button>
            </>
          )
        }
      />

      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'mb-4 flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm',
            notice.tone === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200',
          )}
        >
          {notice.text}
          <button type="button" className="shrink-0 opacity-70 hover:opacity-100" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!all.length ? (
        <Card>
          <EmptyState title="The depository is empty" icon={Library}>
            {can.manageDepository ? (
              <div className="flex flex-col items-center gap-3">
                <p>Import an Excel sheet listing your activities and the items each one needs. Start from the template to get the columns right.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn-secondary" onClick={() => void downloadTemplate().catch((e: Error) => setNotice({ tone: 'error', text: e.message }))}>
                    <Download className="h-4 w-4" aria-hidden /> Download template
                  </button>
                  <button type="button" className="btn-primary" onClick={() => setImporting(true)}>
                    <Upload className="h-4 w-4" aria-hidden /> Import from Excel
                  </button>
                </div>
              </div>
            ) : (
              'An Admin or Program Executive hasn’t imported any activities yet. Checklists will appear here once they do.'
            )}
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" aria-hidden />
              <input type="search" className="input pl-8" placeholder="Search activities and items…" aria-label="Search activities and items" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {categories.length > 0 && (
              <select className="input w-auto" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <span className="text-xs muted">
                {busy ? 'Preparing file…' : `Checklist of ${shown.length === all.length ? 'all' : shown.length} activit${shown.length === 1 ? 'y' : 'ies'}`}
              </span>
              <DownloadButtons acts={shown} onDownload={(f, a) => void onDownload(f, a)} label="Download checklist of the activities shown" />
            </div>
          </div>

          <div className="space-y-3">
            {shown.map((a) => {
              const isOpen = open.has(a.id);
              const done = a.items.filter((i) => ticks.has(i.id)).length;
              return (
                <Card key={a.id}>
                  <div className="flex flex-wrap items-start gap-3 p-4">
                    <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-expanded={isOpen} aria-controls={`dep-${a.id}`} onClick={() => toggleOpen(a.id)}>
                      <ChevronDown className={cx('mt-0.5 h-4 w-4 shrink-0 text-stone-400 transition-transform', !isOpen && '-rotate-90')} aria-hidden />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {a.code && <span className="font-mono text-xs muted">{a.code}</span>}
                          <h2 className="text-sm font-semibold">{a.name}</h2>
                          {a.category && <Tag>{a.category}</Tag>}
                        </div>
                        {a.description && <p className="mt-0.5 text-sm muted">{a.description}</p>}
                        <p className="mt-1 text-xs muted tabular-nums">
                          {a.items.length} item{a.items.length === 1 ? '' : 's'}
                          {done > 0 && ` · ${done} ticked`}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <DownloadButtons compact acts={[a]} onDownload={(f, x) => void onDownload(f, x)} label={`Download checklist for ${a.name}`} />
                      {can.manageDepository && (
                        <ConfirmButton className="btn-ghost p-1.5 text-xs text-red-700 dark:text-red-400" ariaLabel={`Remove ${a.name}`} title="Remove from depository" confirmLabel="Remove?" onConfirm={() => void remove('depository', a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmButton>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <div id={`dep-${a.id}`} className="border-t border-stone-100 px-4 pb-4 pt-2 dark:border-stone-800">
                      {!a.items.length ? (
                        <p className="py-2 text-sm muted">No items listed for this activity.</p>
                      ) : (
                        <>
                          <div className="-mx-4 overflow-x-auto sm:mx-0">
                            <table className="w-full text-sm">
                              <caption className="sr-only">Items for {a.name}</caption>
                              <thead>
                                <tr className="border-b border-stone-200 dark:border-stone-800">
                                  <th className="th w-10" scope="col"><span className="sr-only">Done</span></th>
                                  <th className="th" scope="col">Item</th>
                                  <th className="th" scope="col">Qty</th>
                                  <th className="th" scope="col">Unit</th>
                                  <th className="th hidden md:table-cell" scope="col">Responsible</th>
                                  <th className="th hidden md:table-cell" scope="col">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {a.items.map((it) => {
                                  const on = ticks.has(it.id);
                                  return (
                                    <tr key={it.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800/60">
                                      <td className="td">
                                        <button type="button" role="checkbox" aria-checked={on} aria-label={`${it.name} done`} onClick={() => toggle(it.id)} className="flex text-brand-600 dark:text-brand-400">
                                          {on ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-stone-400" />}
                                        </button>
                                      </td>
                                      <td className={cx('td', on && 'text-stone-400 line-through dark:text-stone-500')}>{it.name}</td>
                                      <td className="td tabular-nums">{it.quantity || '—'}</td>
                                      <td className="td">{it.unit || '—'}</td>
                                      <td className="td hidden md:table-cell">{it.responsible || '—'}</td>
                                      <td className="td hidden text-stone-600 dark:text-stone-300 md:table-cell">{it.notes || '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs muted">
                            <span>Ticks are saved for you in this browser and included in your downloads.</span>
                            {done > 0 && (
                              <button type="button" className="font-medium text-brand-700 hover:underline dark:text-brand-300" onClick={() => clear(a.items.map((i) => i.id))}>
                                Clear ticks
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
            {!shown.length && (
              <Card>
                <EmptyState title="No activities match your search" />
              </Card>
            )}
          </div>

          {can.manageDepository && (
            <div className="mt-6 flex justify-end">
              <ConfirmButton className="btn-ghost text-red-700 dark:text-red-400" confirmLabel={`Click again to remove all ${all.length} activities`} onConfirm={() => void bulk('depository', { remove: all.map((a) => a.id) })}>
                <Trash2 className="h-4 w-4" aria-hidden /> Empty the depository
              </ConfirmButton>
            </div>
          )}
        </>
      )}

      {importing && <ImportDialog onClose={() => setImporting(false)} onImported={(text) => setNotice({ tone: 'ok', text })} />}
    </>
  );
}
