import { BarChart3, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

interface ChartCardProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Accessible table alternative for the chart. */
  table?: ReactNode;
  actions?: ReactNode;
  height?: number;
  className?: string;
  legend?: ReactNode;
}

/** Card wrapper for every chart: title, legend slot, and a chart ⇄ table toggle. */
export function ChartCard({ title, subtitle, children, table, actions, height = 280, className, legend }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card className={className}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {actions}
            {table && (
              <button
                type="button"
                className="btn-ghost p-1.5"
                onClick={() => setShowTable((s) => !s)}
                aria-pressed={showTable}
                aria-label={showTable ? `Show ${title} as chart` : `Show ${title} as table`}
                title={showTable ? 'Show chart' : 'Show data table'}
              >
                {showTable ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
              </button>
            )}
          </>
        }
      />
      <CardBody>
        {legend && !showTable && <div className="mb-2">{legend}</div>}
        {showTable && table ? (
          <div className="overflow-x-auto">{table}</div>
        ) : (
          <div style={{ height }} role="img" aria-label={`${title} chart`}>
            {children}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={i.dashed ? { border: `2px dashed ${i.color}` } : { background: i.color }}
            aria-hidden
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Minimal accessible table used as the chart alternative. */
export function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-stone-200 dark:border-stone-800">
          {head.map((h, i) => (
            <th key={h} className={`th ${i > 0 ? 'text-right' : ''}`} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-stone-100 last:border-0 dark:border-stone-800/60">
            {r.map((c, j) => (
              <td key={j} className={`td ${j > 0 ? 'text-right tabular-nums' : ''}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
