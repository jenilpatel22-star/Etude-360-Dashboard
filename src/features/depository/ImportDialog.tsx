import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/data/DataProvider';
import { downloadTemplate, parseExcelFile, planImport, type ImportMode, type ParsedImport } from '@/lib/depository';
import { cx } from '@/lib/format';

export function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: (summary: string) => void }) {
  const { data, bulk } = useData();
  const { account } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<ImportMode>('merge');

  const choose = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setParsed(null);
    setError(null);
    setBusy(true);
    try {
      setParsed(await parseExcelFile(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const blocking = parsed?.errors.filter((e) => e.row === undefined) ?? [];
  const skipped = parsed?.errors.filter((e) => e.row !== undefined) ?? [];
  const canImport = !!parsed && !blocking.length && parsed.activities.length > 0;
  const plan = canImport && parsed && file ? planImport(data.depository, parsed.activities, mode, { sourceFile: file.name, importedBy: account?.displayName ?? '' }) : null;

  const doImport = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await bulk('depository', plan);
      onImported(
        `Imported ${parsed!.activities.length} activities and ${parsed!.itemCount} items from ${file!.name}` +
          (mode === 'merge' ? ` (${plan.create.length} new, ${plan.update.length} updated).` : ' and replaced the previous depository.'),
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      wide
      title="Import activities from Excel"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-ghost mr-auto" onClick={() => void downloadTemplate().catch((e: Error) => setError(e.message))}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden /> Download template
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={!canImport || busy} onClick={() => void doImport()}>
            {busy && parsed ? 'Importing…' : canImport ? `Import ${parsed!.activities.length} activities` : 'Import'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          className={cx(
            'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
            dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-stone-300 dark:border-stone-700',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void choose(e.dataTransfer.files[0]);
          }}
        >
          <Upload className="h-6 w-6 text-stone-400" aria-hidden />
          <p className="text-sm">
            {file ? (
              <>
                <span className="font-medium">{file.name}</span> <span className="muted">({Math.ceil(file.size / 1024)} KB)</span>
              </>
            ) : (
              'Drop an Excel file here, or'
            )}
          </p>
          <button type="button" className="btn-secondary py-1.5" onClick={() => inputRef.current?.click()}>
            {file ? 'Choose a different file' : 'Choose file'}
          </button>
          <input
            ref={inputRef}
            id="depository-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label="Excel file to import"
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <p className="text-xs muted">
            One row per item with columns Activity and Item (Activity Code, Category, Description, Quantity, Unit, Responsible and Notes are optional).
          </p>
        </div>

        {busy && !parsed && <p className="text-sm muted" role="status">Reading {file?.name}…</p>}
        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {parsed && (
          <div className="space-y-4" aria-live="polite">
            {blocking.map((e) => (
              <p key={e.message} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {e.message}
              </p>
            ))}
            {canImport && (
              <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Found <strong>{parsed.activities.length}</strong> activities and <strong>{parsed.itemCount}</strong> items on sheet “{parsed.sheetName}” (header on row {parsed.headerRow}).
                </span>
              </div>
            )}
            {(skipped.length > 0 || parsed.warnings.length > 0) && (
              <details className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30" open={skipped.length > 0}>
                <summary className="flex cursor-pointer items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                  {skipped.length > 0 && `${skipped.length} row${skipped.length > 1 ? 's' : ''} will be skipped`}
                  {skipped.length > 0 && parsed.warnings.length > 0 && ' · '}
                  {parsed.warnings.length > 0 && `${parsed.warnings.length} warning${parsed.warnings.length > 1 ? 's' : ''}`}
                </summary>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-amber-900 dark:text-amber-100">
                  {[...skipped, ...parsed.warnings]
                    .sort((a, b) => (a.row ?? 0) - (b.row ?? 0))
                    .map((w, i) => (
                      <li key={i}>
                        {w.row !== undefined && <span className="font-mono text-xs">Row {w.row}: </span>}
                        {w.message}
                      </li>
                    ))}
                </ul>
              </details>
            )}

            {canImport && (
              <>
                <div className="max-h-56 overflow-auto rounded-lg border border-stone-200 dark:border-stone-800">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Preview of activities to import</caption>
                    <thead className="sticky top-0 bg-stone-50 dark:bg-stone-900">
                      <tr>
                        <th className="th" scope="col">Code</th>
                        <th className="th" scope="col">Activity</th>
                        <th className="th" scope="col">Category</th>
                        <th className="th text-right" scope="col">Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.activities.map((a) => (
                        <tr key={`${a.firstRow}`} className="border-t border-stone-100 dark:border-stone-800">
                          <td className="td font-mono text-xs">{a.code || '—'}</td>
                          <td className="td">
                            <div className="font-medium">{a.name}</div>
                            <div className="truncate text-xs muted">{a.items.slice(0, 4).map((i) => i.name).join(', ')}{a.items.length > 4 ? '…' : ''}</div>
                          </td>
                          <td className="td">{a.category || '—'}</td>
                          <td className="td text-right tabular-nums">{a.items.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {data.depository.length > 0 && (
                <fieldset>
                  <legend className="label">How to import</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ['merge', 'Add and update', `Activities with the same code (or name) are updated; new ones are added; the other ${data.depository.length} stay as they are.`],
                        ['replace', 'Replace everything', `Remove all ${data.depository.length} current activities and use only this file.`],
                      ] as const
                    ).map(([value, label, help]) => (
                      <label
                        key={value}
                        className={cx(
                          'flex cursor-pointer gap-2 rounded-lg border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500',
                          mode === value ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20' : 'border-stone-200 dark:border-stone-700',
                        )}
                      >
                        <input type="radio" name="mode" value={value} className="mt-0.5 accent-brand-600" checked={mode === value} onChange={() => setMode(value)} />
                        <span>
                          <span className="block font-medium">{label}</span>
                          <span className="block text-xs muted">{help}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {plan && mode === 'merge' && (
                    <p className="mt-2 text-xs muted">
                      {plan.create.length} new · {plan.update.length} updated
                    </p>
                  )}
                </fieldset>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
