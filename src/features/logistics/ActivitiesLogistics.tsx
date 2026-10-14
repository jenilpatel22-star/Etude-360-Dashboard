import { AlertTriangle, CalendarCheck, ChevronDown, Clock, Gauge, Pencil, Plus, PoundSterling } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, Legend, SimpleTable } from '@/components/charts/ChartCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useData, useLookups } from '@/data/DataProvider';
import { ActivityForm } from '@/features/forms/ActivityForm';
import { LogisticsForm } from '@/features/forms/LogisticsForm';
import { useProgram } from '@/features/program/ProgramLayout';
import { actualSpend, costByCategory, isDueSoon, isOverdue, plannedSpend, readiness } from '@/lib/analytics';
import { tooltipStyle, useChartTheme } from '@/lib/chartTheme';
import { formatDate, formatTime, formatWeekday, relativeDays } from '@/lib/dates';
import { capitalise, cx, formatCompactCurrency, formatCurrency, formatPct } from '@/lib/format';
import { ACTIVITY_STATUSES, ACTIVITY_TYPES, LOGISTICS_CATEGORIES, LOGISTICS_STATUSES, type Activity, type LogisticsItem } from '@/types';

export default function ActivitiesLogistics() {
  const program = useProgram();
  const { data, update } = useData();
  const { staffName } = useLookups();
  const { can } = useAuth();
  const t = useChartTheme();
  const canActivities = can.editActivities(program);
  const canLogistics = can.editLogistics(program);

  const [activityEdit, setActivityEdit] = useState<Activity | 'new' | null>(null);
  const [logEdit, setLogEdit] = useState<LogisticsItem | 'new' | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const activities = useMemo(
    () =>
      data.activities
        .filter((a) => a.programId === program.id)
        .filter((a) => (!typeFilter || a.type === typeFilter) && (!statusFilter || a.status === statusFilter)),
    [data.activities, program.id, typeFilter, statusFilter],
  );
  const items = useMemo(() => data.logistics.filter((l) => l.programId === program.id), [data.logistics, program.id]);
  const overdue = items.filter((l) => isOverdue(l)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const dueSoon = items.filter((l) => isDueSoon(l));
  const ready = readiness(items);
  const planned = plannedSpend(items);
  const actual = actualSpend(items);
  const costs = costByCategory(items);

  const activityColumns: Column<Activity>[] = [
    {
      key: 'when',
      header: 'When',
      value: (a) => a.start,
      render: (a) => (
        <div className="whitespace-nowrap">
          <div className="font-medium">{formatWeekday(a.start.slice(0, 10))}</div>
          <div className="text-xs muted tabular-nums">
            {formatTime(a.start)}–{formatTime(a.end)}
          </div>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Activity',
      value: (a) => a.title,
      render: (a) => (
        <div className="min-w-[10rem]">
          <div className="font-medium">{a.title}</div>
          <div className="text-xs muted">
            {capitalise(a.type)} · {a.location}
          </div>
        </div>
      ),
    },
    { key: 'owner', header: 'Owner', value: (a) => staffName(a.ownerId), hideOnMobile: true },
    { key: 'status', header: 'Status', value: (a) => a.status, render: (a) => <StatusBadge status={a.status} /> },
    ...(canActivities
      ? [
          {
            key: 'edit',
            header: '',
            sortable: false,
            align: 'right' as const,
            render: (a: Activity) => (
              <button type="button" className="btn-ghost p-1.5" onClick={() => setActivityEdit(a)} aria-label={`Edit ${a.title}`}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ),
          },
        ]
      : []),
  ];

  const cycleStatus = (l: LogisticsItem) => {
    const next = LOGISTICS_STATUSES[(LOGISTICS_STATUSES.indexOf(l.status) + 1) % LOGISTICS_STATUSES.length];
    if (next === 'Done' && l.actualCost == null) {
      setLogEdit({ ...l, status: 'Done' });
      return;
    }
    void update('logistics', l.id, { status: next });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Readiness score"
          value={formatPct(ready)}
          icon={Gauge}
          progress={ready}
          progressLabel="Logistics confirmed"
          tone={ready >= 0.8 ? 'good' : ready >= 0.5 ? 'warning' : 'critical'}
          hint={`${items.filter((l) => l.status !== 'Pending').length} of ${items.length} items confirmed or done`}
        />
        <KpiCard
          label="Overdue items"
          value={<span className={cx(overdue.length > 0 && 'text-red-700 dark:text-red-400')}>{overdue.length}</span>}
          icon={AlertTriangle}
          hint={`${dueSoon.length} more due within 7 days`}
        />
        <KpiCard
          label="Planned cost vs budget"
          value={formatPct(program.budget ? planned / program.budget : 0)}
          icon={PoundSterling}
          progress={program.budget ? planned / program.budget : 0}
          tone={planned > program.budget ? 'critical' : 'default'}
          hint={`${formatCompactCurrency(planned)} of ${formatCompactCurrency(program.budget)}`}
        />
        <KpiCard
          label="Actual spend to date"
          value={formatCompactCurrency(actual)}
          icon={CalendarCheck}
          hint={
            <span className={cx(actual > planned && 'text-red-700 dark:text-red-400')}>
              {actual > planned ? 'Over' : 'Within'} plan by {formatCompactCurrency(Math.abs(planned - actual))}
            </span>
          }
        />
      </div>

      {overdue.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {overdue.length} overdue logistics item{overdue.length > 1 ? 's' : ''} need attention
          </div>
          <ul className="mt-2 space-y-1 text-sm text-red-900 dark:text-red-200">
            {overdue.map((l) => (
              <li key={l.id} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{l.description}</span>
                <span className="opacity-80">
                  ({l.category} · {l.vendor}) — due {formatDate(l.dueDate)}, {relativeDays(l.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Activity agenda"
            subtitle={`${activities.length} activities · owner and status`}
            actions={
              canActivities && (
                <button type="button" className="btn-primary py-1.5" onClick={() => setActivityEdit('new')}>
                  <Plus className="h-4 w-4" aria-hidden /> Add
                </button>
              )
            }
          />
          <CardBody>
            <DataTable
              caption="Activity agenda"
              rows={activities}
              columns={activityColumns}
              rowKey={(a) => a.id}
              searchText={(a) => `${a.title} ${a.type} ${staffName(a.ownerId)} ${a.location}`}
              searchPlaceholder="Search activities…"
              initialSort={{ key: 'when', dir: 'asc' }}
              pageSize={8}
              rowClassName={(a) => (a.status === 'Cancelled' ? 'opacity-60' : undefined)}
              toolbar={
                <>
                  <select className="input w-auto" aria-label="Filter by activity type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">All types</option>
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {capitalise(t)}
                      </option>
                    ))}
                  </select>
                  <select className="input w-auto" aria-label="Filter by activity status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All statuses</option>
                    {ACTIVITY_STATUSES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </>
              }
            />
          </CardBody>
        </Card>

        <ChartCard
          className="xl:col-span-2"
          title="Cost breakdown"
          subtitle="Planned vs actual by category"
          height={Math.max(220, costs.length * 46)}
          legend={
            <Legend
              items={[
                { label: 'Planned', color: t.series[0] },
                { label: 'Actual', color: t.series[1] },
              ]}
            />
          }
          table={
            <SimpleTable
              head={['Category', 'Planned', 'Actual', 'Variance']}
              rows={costs.map((c) => [c.category, formatCurrency(c.planned), formatCurrency(c.actual), formatCurrency(c.actual - c.planned)])}
            />
          }
        >
          {!costs.length ? (
            <EmptyState title="No costs yet">Costs appear once logistics items are added.</EmptyState>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costs} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid horizontal={false} stroke={t.grid} />
              <XAxis type="number" tickFormatter={formatCompactCurrency} stroke={t.axis} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="category" width={92} stroke={t.axis} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle(t)} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="planned" name="Planned" fill={t.series[0]} radius={[0, 4, 4, 0]} maxBarSize={14} />
              <Bar dataKey="actual" name="Actual" fill={t.series[1]} radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <Card>
        <CardHeader
          title="Logistics checklist"
          subtitle={canLogistics ? 'Grouped by category · click a status to advance it' : 'Grouped by category'}
          actions={
            canLogistics && (
              <button type="button" className="btn-primary py-1.5" onClick={() => setLogEdit('new')}>
                <Plus className="h-4 w-4" aria-hidden /> Add item
              </button>
            )
          }
        />
        <CardBody className="space-y-3">
          {!items.length && <EmptyState title="No logistics items yet" />}
          {LOGISTICS_CATEGORIES.map((cat) => {
            const list = items.filter((l) => l.category === cat).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            if (!list.length) return null;
            const done = list.filter((l) => l.status !== 'Pending').length;
            const open = !collapsed[cat];
            return (
              <div key={cat} className="rounded-lg border border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  aria-expanded={open}
                  onClick={() => setCollapsed((c) => ({ ...c, [cat]: open }))}
                >
                  <ChevronDown className={cx('h-4 w-4 text-stone-400 transition-transform', !open && '-rotate-90')} aria-hidden />
                  <span className="text-sm font-semibold capitalize">{cat}</span>
                  <span className="text-xs muted tabular-nums">
                    {done}/{list.length} ready
                  </span>
                  <span className="ml-auto text-xs tabular-nums muted">{formatCurrency(plannedSpend(list))} planned</span>
                </button>
                {open && (
                  <ul className="divide-y divide-stone-100 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                    {list.map((l) => {
                      const od = isOverdue(l);
                      const soon = isDueSoon(l);
                      return (
                        <li key={l.id} className={cx('grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-3 py-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_7rem_7rem_auto]', od && 'bg-red-50/60 dark:bg-red-950/20')}>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{l.description}</div>
                            <div className="truncate text-xs muted">{l.vendor}</div>
                          </div>
                          <div className="order-last col-span-2 flex items-center gap-2 text-xs sm:order-none sm:col-span-1">
                            <Clock className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                            <span className="tabular-nums">{formatDate(l.dueDate)}</span>
                            {od && <StatusBadge status="Overdue" />}
                            {soon && <StatusBadge status="Due soon" />}
                          </div>
                          <div className="hidden text-right text-xs tabular-nums sm:block">
                            <div className="muted">Planned</div>
                            {formatCurrency(l.plannedCost)}
                          </div>
                          <div className="hidden text-right text-xs tabular-nums sm:block">
                            <div className="muted">Actual</div>
                            <span className={cx(l.actualCost != null && l.actualCost > l.plannedCost && 'text-red-700 dark:text-red-400')}>
                              {l.actualCost == null ? '—' : formatCurrency(l.actualCost)}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            {canLogistics ? (
                              <button type="button" onClick={() => cycleStatus(l)} title="Advance status" aria-label={`${l.description}: ${l.status}. Advance status`}>
                                <StatusBadge status={l.status} className="cursor-pointer hover:brightness-95" />
                              </button>
                            ) : (
                              <StatusBadge status={l.status} />
                            )}
                            {canLogistics && (
                              <button type="button" className="btn-ghost p-1.5" onClick={() => setLogEdit(l)} aria-label={`Edit ${l.description}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </CardBody>
      </Card>

      {activityEdit && <ActivityForm program={program} activity={activityEdit === 'new' ? undefined : activityEdit} onClose={() => setActivityEdit(null)} />}
      {logEdit && <LogisticsForm program={program} item={logEdit === 'new' ? undefined : logEdit} onClose={() => setLogEdit(null)} />}
    </div>
  );
}
