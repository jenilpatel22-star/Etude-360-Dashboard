import { ArrowDownRight, ArrowUpRight, Award, FileText, Lightbulb, MessagesSquare, Scale, Sparkles, Target, Trophy } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/layout/AppLayout';
import { ChartCard, Legend, SimpleTable } from '@/components/charts/ChartCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiCard } from '@/components/ui/KpiCard';
import { useData } from '@/data/DataProvider';
import {
  autoSummary,
  categoryPerformance,
  gapAnalysis,
  groupByDimension,
  nps,
  overall360,
  programHeatmap,
  quarterlyTrend,
  trainerLeaderboard,
} from '@/lib/analytics';
import { DIMENSION_360_LABELS, GROUP_SLOT, SEQUENTIAL, tooltipStyle, useChartTheme } from '@/lib/chartTheme';
import { exportElementToPdf } from '@/lib/export';
import { cx, formatNps, formatScore } from '@/lib/format';
import { DIMENSIONS_360, PROGRAM_CATEGORIES, RESPONDENT_GROUPS, type Dataset, type RespondentGroup } from '@/types';

/** Map a 1–5 score onto the sequential ramp (scores cluster 3–5, so stretch that band). */
function heatColor(v: number) {
  if (!Number.isFinite(v)) return { bg: 'transparent', fg: 'inherit' };
  const t = Math.max(0, Math.min(1, (v - 2.8) / 2));
  const idx = Math.round(t * (SEQUENTIAL.length - 1));
  return { bg: SEQUENTIAL[idx], fg: idx >= 7 ? '#ffffff' : '#0b0b0b' };
}

type LeaderRow = ReturnType<typeof trainerLeaderboard>[number];

export default function OrgAnalysis() {
  const { data: all } = useData();
  const t = useChartTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState('');
  const [hidden, setHidden] = useState<Set<RespondentGroup>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Scope the whole page to a category if selected.
  const data: Dataset = useMemo(() => {
    if (!category) return all;
    const programs = all.programs.filter((p) => p.category === category);
    const ids = new Set(programs.map((p) => p.id));
    return {
      ...all,
      programs,
      feedback: all.feedback.filter((f) => ids.has(f.programId)),
      feedback360: all.feedback360.filter((f) => ids.has(f.programId)),
    };
  }, [all, category]);

  const groups = useMemo(() => groupByDimension(data.feedback360), [data.feedback360]);
  const heat = useMemo(() => programHeatmap(data.programs, data.feedback360).sort((a, b) => b.overall - a.overall), [data]);
  const gaps = useMemo(() => gapAnalysis(data.feedback360), [data.feedback360]);
  const leaders = useMemo(() => trainerLeaderboard(data), [data]);
  const cats = useMemo(() => categoryPerformance(all), [all]);
  const quarters = useMemo(() => quarterlyTrend(data), [data]);
  const summary = useMemo(() => (data.feedback360.length ? autoSummary(data) : null), [data]);

  const radarData = DIMENSIONS_360.map((d) => ({
    dimension: DIMENSION_360_LABELS[d],
    ...Object.fromEntries(groups.map((g) => [g.group, g.scores[d]])),
  }));
  const groupColor = (g: RespondentGroup) => t.series[GROUP_SLOT[g]];
  const biggestGap = [...gaps].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
  const lastQ = quarters[quarters.length - 1];
  const prevQ = quarters[quarters.length - 2];

  const onPdf = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      await exportElementToPdf(ref.current, `360-organisation-analysis${category ? `-${category.toLowerCase().replace(/\W+/g, '-')}` : ''}.pdf`, '360° organisation analysis');
    } finally {
      setExporting(false);
    }
  };

  const leaderColumns: Column<LeaderRow>[] = [
    {
      key: 'rank',
      header: '#',
      render: (r) => {
        const i = leaders.indexOf(r);
        return i < 3 ? <Trophy className={cx('h-4 w-4', i === 0 ? 'text-amber-500' : i === 1 ? 'text-stone-400' : 'text-orange-700')} aria-label={`Rank ${i + 1}`} /> : <span className="tabular-nums muted">{i + 1}</span>;
      },
    },
    {
      key: 'name',
      header: 'Trainer',
      value: (r) => r.trainer.name,
      render: (r) => (
        <div>
          <div className="whitespace-nowrap font-medium">{r.trainer.name}</div>
          <div className="text-xs muted">{r.trainer.specialties.join(' · ')}</div>
        </div>
      ),
    },
    { key: 'programs', header: 'Programmes', value: (r) => r.programs, align: 'right', hideOnMobile: true },
    { key: 'responses', header: 'Responses', value: (r) => r.responses, align: 'right', hideOnMobile: true },
    {
      key: 'trainerScore',
      header: 'Trainer rating',
      value: (r) => r.trainerScore,
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="hidden h-1.5 w-20 rounded-full bg-stone-100 dark:bg-stone-800 sm:block" aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${(r.trainerScore / 5) * 100}%`, background: t.series[0] }} />
          </div>
          <span className="w-10 tabular-nums">{formatScore(r.trainerScore)}</span>
        </div>
      ),
    },
    { key: 'delivery', header: '360 delivery', value: (r) => r.delivery360, align: 'right', render: (r) => formatScore(r.delivery360), hideOnMobile: true },
    { key: 'nps', header: 'NPS', value: (r) => r.nps, align: 'right', render: (r) => formatNps(r.nps) },
  ];

  return (
    <div ref={ref}>
      <PageHeader
        title="360° organisation analysis"
        subtitle={`Aggregated across ${heat.length} programmes and ${groups.length} stakeholder groups · ${data.feedback360.length} 360° responses`}
        actions={
          <>
            <select className="input w-auto" aria-label="Scope to category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {PROGRAM_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={() => void onPdf()} disabled={exporting}>
              <FileText className="h-4 w-4" aria-hidden /> {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </>
        }
      />

      {!data.feedback360.length ? (
        <Card>
          <EmptyState title="No 360° feedback for this scope yet" />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Overall 360° score" value={<>{formatScore(overall360(data.feedback360))}<span className="text-sm font-normal muted"> / 5</span></>} icon={Award} hint="Mean of all dimensions and groups" />
            <KpiCard label="Organisation NPS" value={formatNps(nps(data.feedback.map((f) => f.nps)))} icon={MessagesSquare} hint={`${data.feedback.length} programme evaluations`} />
            <KpiCard
              label="Latest quarter"
              value={lastQ ? formatScore(lastQ.score360) : '—'}
              icon={lastQ && prevQ && lastQ.score360 < prevQ.score360 ? ArrowDownRight : ArrowUpRight}
              hint={lastQ && prevQ ? `${lastQ.quarter}: ${lastQ.score360 >= prevQ.score360 ? '▲' : '▼'} ${Math.abs(lastQ.score360 - prevQ.score360).toFixed(2)} vs ${prevQ.quarter}` : lastQ?.quarter}
            />
            <KpiCard
              label="Largest perception gap"
              value={biggestGap ? `${biggestGap.gap > 0 ? '+' : ''}${biggestGap.gap.toFixed(2)}` : '—'}
              icon={Scale}
              hint={biggestGap ? `${DIMENSION_360_LABELS[biggestGap.dimension]} (self − external)` : undefined}
            />
          </div>

          {summary && (
            <Card className="overflow-hidden">
              <CardHeader title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" aria-hidden />Auto-generated summary</span>} subtitle="Derived from 360° dimension scores, stakeholder gaps and programme heatmap" />
              <CardBody className="grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-300">
                    <Award className="h-3.5 w-3.5" aria-hidden /> Top strengths
                  </h3>
                  <ol className="space-y-2.5">
                    {summary.strengths.map((s, i) => (
                      <li key={s.dimension} className="text-sm">
                        <span className="font-medium">
                          {i + 1}. {DIMENSION_360_LABELS[s.dimension]} <span className="tabular-nums muted">({s.score.toFixed(2)})</span>
                        </span>
                        <p className="text-xs muted">{s.note}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300">
                    <Target className="h-3.5 w-3.5" aria-hidden /> Improvement areas
                  </h3>
                  <ol className="space-y-2.5">
                    {summary.improvements.map((s, i) => (
                      <li key={s.dimension} className="text-sm">
                        <span className="font-medium">
                          {i + 1}. {DIMENSION_360_LABELS[s.dimension]} <span className="tabular-nums muted">({s.score.toFixed(2)})</span>
                        </span>
                        <p className="text-xs muted">{s.note}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Recommended actions
                  </h3>
                  <ul className="list-disc space-y-2 pl-4 text-sm">
                    {summary.actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Stakeholder perspectives"
              subtitle="Average score by group across six dimensions · click a group to toggle"
              height={340}
              legend={
                <div className="flex flex-wrap gap-1.5" data-export-ignore={undefined}>
                  {groups.map((g) => {
                    const off = hidden.has(g.group);
                    return (
                      <button
                        key={g.group}
                        type="button"
                        aria-pressed={!off}
                        onClick={() =>
                          setHidden((h) => {
                            const n = new Set(h);
                            if (n.has(g.group)) n.delete(g.group);
                            else n.add(g.group);
                            return n;
                          })
                        }
                        className={cx('flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs', off ? 'border-stone-200 opacity-50 dark:border-stone-700' : 'border-stone-300 dark:border-stone-600')}
                      >
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: groupColor(g.group) }} aria-hidden />
                        {g.group} <span className="muted">n={g.n}</span>
                      </button>
                    );
                  })}
                </div>
              }
              table={
                <SimpleTable
                  head={['Group', ...DIMENSIONS_360.map((d) => DIMENSION_360_LABELS[d])]}
                  rows={groups.map((g) => [g.group, ...DIMENSIONS_360.map((d) => formatScore(g.scores[d]))])}
                />
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke={t.grid} />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: t.axis, fontSize: 12 }} />
                  <PolarRadiusAxis domain={[2.5, 5]} tickCount={6} tick={{ fill: t.muted, fontSize: 10 }} axisLine={false} angle={60} />
                  <Tooltip {...tooltipStyle(t)} formatter={(v: number) => formatScore(v)} />
                  {RESPONDENT_GROUPS.filter((g) => groups.some((x) => x.group === g) && !hidden.has(g)).map((g) => (
                    <Radar key={g} name={g} dataKey={g} stroke={groupColor(g)} strokeWidth={2} fill={groupColor(g)} fillOpacity={0.06} dot={{ r: 3, fill: groupColor(g) }} isAnimationActive={false} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Gap analysis: self vs external perception"
              subtitle="Internal staff (self-assessment) vs participants & sponsors"
              height={340}
              legend={
                <Legend
                  items={[
                    { label: 'Internal staff (self)', color: t.series[6] },
                    { label: 'Participants & sponsors (external)', color: t.series[0] },
                  ]}
                />
              }
              table={
                <SimpleTable
                  head={['Dimension', 'Self', 'External', 'Gap']}
                  rows={gaps.map((g) => [DIMENSION_360_LABELS[g.dimension], formatScore(g.self), formatScore(g.external), `${g.gap > 0 ? '+' : ''}${g.gap.toFixed(2)}`])}
                />
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gaps.map((g) => ({ ...g, label: DIMENSION_360_LABELS[g.dimension], gapLabel: `${g.gap > 0 ? '+' : ''}${g.gap.toFixed(2)}` }))} layout="vertical" margin={{ left: 0, right: 40 }} barGap={2} barCategoryGap="22%">
                  <CartesianGrid horizontal={false} stroke={t.grid} />
                  <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} stroke={t.axis} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" width={104} stroke={t.axis} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle(t)} formatter={(v: number) => formatScore(v)} />
                  <Bar dataKey="self" name="Internal staff (self)" fill={t.series[6]} radius={[0, 4, 4, 0]} maxBarSize={12} />
                  <Bar dataKey="external" name="External" fill={t.series[0]} radius={[0, 4, 4, 0]} maxBarSize={12}>
                    <LabelList dataKey="gapLabel" position="right" fill={t.text} fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card>
            <CardHeader title="Heatmap: programmes × dimensions" subtitle="Average 360° score · darker = stronger" />
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-separate border-spacing-0.5 text-sm">
                  <caption className="sr-only">Average 360 score per programme and dimension</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="th">Programme</th>
                      {DIMENSIONS_360.map((d) => (
                        <th key={d} scope="col" className="th text-center">
                          {DIMENSION_360_LABELS[d]}
                        </th>
                      ))}
                      <th scope="col" className="th text-center">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heat.map((row) => (
                      <tr key={row.program.id}>
                        <th scope="row" className="max-w-[16rem] truncate px-3 py-2 text-left font-medium">
                          {row.program.title}
                          <span className="ml-1.5 text-xs font-normal muted">n={row.n}</span>
                        </th>
                        {[...DIMENSIONS_360.map((d) => row.scores[d]), row.overall].map((v, i) => {
                          const c = heatColor(v);
                          return (
                            <td
                              key={i}
                              className={cx('rounded-md px-2 py-2 text-center tabular-nums', i === DIMENSIONS_360.length && 'font-semibold')}
                              style={{ background: c.bg, color: c.fg }}
                              title={`${row.program.title} — ${i < DIMENSIONS_360.length ? DIMENSION_360_LABELS[DIMENSIONS_360[i]] : 'Overall'}: ${formatScore(v)}`}
                            >
                              {formatScore(v)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs muted" aria-hidden>
                <span>≤ 2.8</span>
                <div className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(to right, ${SEQUENTIAL.join(',')})` }} />
                <span>4.8+</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Trainer performance leaderboard" subtitle="Ranked by participant trainer rating" />
            <CardBody>
              <DataTable caption="Trainer leaderboard" rows={leaders} columns={leaderColumns} rowKey={(r) => r.trainer.id} pageSize={8} searchText={(r) => r.trainer.name} searchPlaceholder="Find trainer…" />
            </CardBody>
          </Card>

          <div className="grid items-start gap-6 xl:grid-cols-5">
            <ChartCard
              className="xl:col-span-2"
              title="Category performance"
              subtitle={`360° score by programme category${category ? ' (all categories shown for comparison)' : ''}`}
              height={Math.max(220, cats.length * 44)}
              table={<SimpleTable head={['Category', '360° score', 'Overall rating', 'NPS']} rows={cats.map((c) => [c.category, formatScore(c.score360), formatScore(c.overall), formatNps(c.nps)])} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cats} layout="vertical" margin={{ left: 0, right: 36 }} barCategoryGap="28%">
                  <CartesianGrid horizontal={false} stroke={t.grid} />
                  <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} stroke={t.axis} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="category" width={104} stroke={t.axis} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle(t)} formatter={(v: number) => [formatScore(v), '360° score']} />
                  <Bar dataKey="score360" radius={[0, 4, 4, 0]} maxBarSize={18} fill={t.series[0]}>
                    <LabelList dataKey="score360" position="right" formatter={(v: number) => v.toFixed(2)} fill={t.text} fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          <ChartCard
              className="xl:col-span-3"
              title="Quarter-over-quarter trend"
              subtitle="Programme evaluation overall rating and 360° score (both on a 1–5 scale)"
              height={280}
              legend={
                <Legend
                  items={[
                    { label: 'Overall rating (evaluations)', color: t.series[0] },
                    { label: '360° score', color: t.series[1] },
                  ]}
                />
              }
              table={<SimpleTable head={['Quarter', 'Overall rating', '360° score', 'NPS', 'Responses']} rows={quarters.map((q) => [q.quarter, formatScore(q.overall), formatScore(q.score360), formatNps(q.nps), q.responses])} />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quarters.map((q) => ({ ...q, overall: Number.isFinite(q.overall) ? q.overall : null }))} margin={{ top: 16, right: 24, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={t.grid} />
                  <XAxis dataKey="quarter" stroke={t.axis} tickLine={false} axisLine={false} padding={{ left: 24, right: 24 }} />
                  <YAxis domain={[3, 5]} stroke={t.axis} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} />
                  <Tooltip {...tooltipStyle(t)} formatter={(v: number) => formatScore(v)} />
                  <Line type="monotone" dataKey="overall" name="Overall rating" stroke={t.series[0]} strokeWidth={2} dot={{ r: 4, fill: t.series[0], stroke: t.surface, strokeWidth: 2 }} connectNulls />
                  <Line type="monotone" dataKey="score360" name="360° score" stroke={t.series[1]} strokeWidth={2} dot={{ r: 4, fill: t.series[1], stroke: t.surface, strokeWidth: 2 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
