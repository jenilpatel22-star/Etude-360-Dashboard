import { Download, FileText, MessageSquarePlus, MessagesSquare, Star, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, Legend, SimpleTable } from '@/components/charts/ChartCard';
import { NpsGauge } from '@/components/charts/NpsGauge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiCard } from '@/components/ui/KpiCard';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/data/DataProvider';
import { FeedbackForm } from '@/features/forms/FeedbackForm';
import { useProgram } from '@/features/program/ProgramLayout';
import { commentSentiment, commentThemes, feedbackSummary, scoreDistribution, type Sentiment } from '@/lib/analytics';
import { DIMENSION_LABELS, tooltipStyle, useChartTheme } from '@/lib/chartTheme';
import { formatDate, formatShort } from '@/lib/dates';
import { exportCsv, exportElementToPdf, slug } from '@/lib/export';
import { cx, formatNps, formatPct, formatScore } from '@/lib/format';
import { RATING_DIMENSIONS, RESPONDENT_ROLES, type Feedback } from '@/types';

/** Diverging 1→5: red (poor) · neutral · blue (excellent). */
const DIST_LIGHT = ['#b83a3a', '#ef9a9a', '#d6d5d0', '#86b6ef', '#1c5cab'];
const DIST_DARK = ['#e66767', '#a34646', '#4a4a46', '#256abf', '#86b6ef'];

const SENTIMENT_STYLE: Record<Sentiment, string> = {
  positive: 'text-blue-800 bg-blue-50 dark:text-blue-200 dark:bg-blue-950/50',
  negative: 'text-red-800 bg-red-50 dark:text-red-200 dark:bg-red-950/50',
  neutral: 'text-stone-700 bg-stone-100 dark:text-stone-300 dark:bg-stone-800',
};

type TrendMetric = 'overall' | 'nps' | 'responseRate';

export default function FeedbackReport() {
  const program = useProgram();
  const { data } = useData();
  const { can } = useAuth();
  const t = useChartTheme();
  const reportRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [metric, setMetric] = useState<TrendMetric>('overall');
  const [roleFilter, setRoleFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');

  const fb = useMemo(() => data.feedback.filter((f) => f.programId === program.id), [data.feedback, program.id]);
  const summary = useMemo(() => feedbackSummary(program, fb), [program, fb]);
  const dist = useMemo(() => scoreDistribution(fb), [fb]);
  const themes = useMemo(() => commentThemes(fb.map((f) => f.comment).filter(Boolean)), [fb]);
  const sentiments = useMemo(() => new Map(fb.map((f) => [f.id, commentSentiment(f)])), [fb]);

  const trend = useMemo(() => {
    const rows = program.pastRuns.map((r) => ({ label: r.label, date: r.endDate, overall: r.overall, nps: r.nps, responseRate: Math.round(r.responseRate * 100) }));
    if (fb.length)
      rows.push({
        label: 'This run',
        date: program.endDate,
        overall: summary.averages.overall,
        nps: Math.round(summary.nps),
        responseRate: Math.round(summary.responseRate * 100),
      });
    return rows;
  }, [program, fb.length, summary]);

  const positive = [...themes].filter((x) => x.positive > 0).sort((a, b) => b.positive - a.positive).slice(0, 5);
  const negative = [...themes].filter((x) => x.negative > 0).sort((a, b) => b.negative - a.negative).slice(0, 5);
  const prev = program.pastRuns[program.pastRuns.length - 1];

  const comments = fb
    .filter((f) => f.comment)
    .filter((f) => (!roleFilter || f.respondentRole === roleFilter) && (!sentimentFilter || sentiments.get(f.id) === sentimentFilter));

  const commentColumns: Column<Feedback>[] = [
    { key: 'date', header: 'Date', value: (f) => f.submittedAt, render: (f) => <span className="whitespace-nowrap">{formatShort(f.submittedAt)}</span> },
    { key: 'role', header: 'Role', value: (f) => f.respondentRole, hideOnMobile: true },
    { key: 'overall', header: 'Overall', value: (f) => f.ratings.overall, align: 'right' },
    { key: 'nps', header: 'NPS', value: (f) => f.nps, align: 'right', hideOnMobile: true },
    {
      key: 'sentiment',
      header: 'Tone',
      value: (f) => sentiments.get(f.id) ?? 'neutral',
      render: (f) => {
        const s = sentiments.get(f.id) ?? 'neutral';
        return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize', SENTIMENT_STYLE[s])}>{s === 'positive' ? <ThumbsUp className="h-3 w-3" aria-hidden /> : s === 'negative' ? <ThumbsDown className="h-3 w-3" aria-hidden /> : null}{s}</span>;
      },
    },
    { key: 'comment', header: 'Comment', value: (f) => f.comment, sortable: false, className: 'min-w-[16rem]' },
  ];

  const onCsv = () =>
    exportCsv(
      `${slug(program.title)}-feedback.csv`,
      fb.map((f) => ({
        programme: program.title,
        submitted: f.submittedAt,
        role: f.respondentRole,
        ...Object.fromEntries(RATING_DIMENSIONS.map((d) => [d, f.ratings[d]])),
        nps: f.nps,
        sentiment: sentiments.get(f.id),
        comment: f.comment,
      })),
    );

  const onPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      await exportElementToPdf(reportRef.current, `${slug(program.title)}-feedback-report.pdf`, `Feedback report — ${program.title}`);
    } finally {
      setExporting(false);
    }
  };

  const toolbar = (
    <div className="flex flex-wrap gap-2" data-export-ignore>
      {can.editFeedback && (
        <button type="button" className="btn-secondary" onClick={() => setAdding(true)}>
          <MessageSquarePlus className="h-4 w-4" aria-hidden /> Record feedback
        </button>
      )}
      <button type="button" className="btn-secondary" onClick={onCsv} disabled={!fb.length}>
        <Download className="h-4 w-4" aria-hidden /> CSV
      </button>
      <button type="button" className="btn-primary" onClick={() => void onPdf()} disabled={!fb.length || exporting}>
        <FileText className="h-4 w-4" aria-hidden /> {exporting ? 'Exporting…' : 'PDF'}
      </button>
    </div>
  );

  if (!fb.length) {
    return (
      <Card>
        <div className="flex justify-end p-4">{toolbar}</div>
        <EmptyState title="No feedback collected yet" icon={MessagesSquare}>
          Feedback opens once delivery starts. {program.status === 'Upcoming' || program.status === 'Potential' ? 'This programme has not started.' : ''}
        </EmptyState>
        {adding && <FeedbackForm program={program} onClose={() => setAdding(false)} />}
      </Card>
    );
  }

  const deltaOverall = prev ? summary.averages.overall - prev.overall : NaN;
  const deltaNps = prev ? summary.nps - prev.nps : NaN;
  const delta = (v: number, digits = 2, suffix = '') =>
    Number.isFinite(v) ? (
      <span className={cx(v >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-400')}>
        {v >= 0 ? '▲' : '▼'} {Math.abs(v).toFixed(digits)}
        {suffix} vs previous run
      </span>
    ) : (
      'First run'
    );

  const dimData = RATING_DIMENSIONS.map((d) => ({ dimension: DIMENSION_LABELS[d], score: summary.averages[d], key: d }));
  const distColors = t.dark ? DIST_DARK : DIST_LIGHT;
  const trendFmt = (v: number) => (metric === 'overall' ? v.toFixed(2) : metric === 'nps' ? formatNps(v) : `${v}%`);

  return (
    <div ref={reportRef} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Feedback report</h2>
          <p className="text-sm muted">
            {summary.responses} responses · last received {formatDate([...fb].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0].submittedAt)}
            {program.status === 'Ongoing' && ' · interim (programme in delivery)'}
          </p>
        </div>
        {toolbar}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Overall rating" value={<>{formatScore(summary.averages.overall)}<span className="text-sm font-normal muted"> / 5</span></>} icon={Star} hint={delta(deltaOverall)} />
        <KpiCard label="Net Promoter Score" value={formatNps(summary.nps)} icon={ThumbsUp} hint={delta(deltaNps, 0)} />
        <KpiCard
          label="Response rate"
          value={formatPct(summary.responseRate)}
          icon={Users}
          progress={summary.responseRate}
          tone={summary.responseRate >= 0.6 ? 'good' : summary.responseRate >= 0.4 ? 'warning' : 'critical'}
          hint={`${summary.participantResponses} of ${program.enrolled} participants`}
        />
        <KpiCard label="Comments" value={fb.filter((f) => f.comment).length} icon={MessagesSquare} hint={`${summary.responses - summary.participantResponses} from managers/observers`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Average score by dimension"
          subtitle="1 = poor · 5 = excellent"
          height={260}
          table={<SimpleTable head={['Dimension', 'Average']} rows={dimData.map((d) => [d.dimension, formatScore(d.score)])} />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dimData} margin={{ top: 20, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={t.grid} />
              <XAxis dataKey="dimension" stroke={t.axis} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} stroke={t.axis} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle(t)} formatter={(v: number) => [formatScore(v), 'Average']} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {dimData.map((d) => (
                  <Cell key={d.key} fill={d.key === 'overall' ? (t.dark ? '#86b6ef' : '#1c5cab') : t.series[0]} />
                ))}
                <LabelList dataKey="score" position="top" formatter={(v: number) => v.toFixed(2)} fill={t.text} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader title="Net Promoter Score" subtitle="% promoters (9–10) − % detractors (0–6)" />
          <CardBody className="flex flex-col items-center">
            <NpsGauge value={summary.nps} />
            <div className="mt-2 w-full">
              <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
                <div style={{ width: formatPct(summary.npsBreakdown.detractors), background: t.series[7] }} />
                <div style={{ width: formatPct(summary.npsBreakdown.passives), background: t.neutral }} />
                <div style={{ width: formatPct(summary.npsBreakdown.promoters), background: t.series[0] }} />
              </div>
              <dl className="mt-2 grid grid-cols-3 text-center text-xs">
                <div>
                  <dt className="muted">Detractors</dt>
                  <dd className="font-semibold tabular-nums">{formatPct(summary.npsBreakdown.detractors)}</dd>
                </div>
                <div>
                  <dt className="muted">Passives</dt>
                  <dd className="font-semibold tabular-nums">{formatPct(summary.npsBreakdown.passives)}</dd>
                </div>
                <div>
                  <dt className="muted">Promoters</dt>
                  <dd className="font-semibold tabular-nums">{formatPct(summary.npsBreakdown.promoters)}</dd>
                </div>
              </dl>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Score distribution"
          subtitle="Number of responses at each rating"
          height={240}
          legend={<Legend items={[1, 2, 3, 4, 5].map((s, i) => ({ label: `${s}${s === 1 ? ' poor' : s === 5 ? ' excellent' : ''}`, color: distColors[i] }))} />}
          table={
            <SimpleTable
              head={['Dimension', '1', '2', '3', '4', '5']}
              rows={dist.map((r) => [DIMENSION_LABELS[r.dimension as keyof typeof DIMENSION_LABELS], r.s1, r.s2, r.s3, r.s4, r.s5] as (string | number)[])}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dist.map((r) => ({ ...r, label: DIMENSION_LABELS[r.dimension as keyof typeof DIMENSION_LABELS] }))} layout="vertical" stackOffset="expand" margin={{ left: 0, right: 8 }} barCategoryGap="25%">
              <XAxis type="number" tickFormatter={(v: number) => `${Math.round(v * 100)}%`} stroke={t.axis} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" width={72} stroke={t.axis} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle(t)} />
              {[1, 2, 3, 4, 5].map((s, i) => (
                <Bar key={s} dataKey={`s${s}`} name={`Rated ${s}`} stackId="d" fill={distColors[i]} stroke={t.surface} strokeWidth={1} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Trend vs previous runs"
          subtitle={trend.length > 1 ? `${trend.length - 1} previous run${trend.length > 2 ? 's' : ''}` : 'No previous runs'}
          height={240}
          actions={
            <Tabs
              label="Trend metric"
              value={metric}
              onChange={setMetric}
              tabs={[
                { id: 'overall', label: 'Rating' },
                { id: 'nps', label: 'NPS' },
                { id: 'responseRate', label: 'Resp.' },
              ]}
            />
          }
          table={<SimpleTable head={['Run', 'Ended', 'Overall', 'NPS', 'Response rate']} rows={trend.map((r) => [r.label, formatShort(r.date), r.overall.toFixed(2), formatNps(r.nps), `${r.responseRate}%`])} />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 16, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={t.grid} />
              <XAxis dataKey="label" stroke={t.axis} tickLine={false} axisLine={false} padding={{ left: 24, right: 24 }} />
              <YAxis
                domain={metric === 'overall' ? [1, 5] : metric === 'nps' ? [-100, 100] : [0, 100]}
                stroke={t.axis}
                tickLine={false}
                axisLine={false}
                tickFormatter={trendFmt}
              />
              <Tooltip {...tooltipStyle(t)} formatter={(v: number) => [trendFmt(v), metric === 'overall' ? 'Overall rating' : metric === 'nps' ? 'NPS' : 'Response rate']} />
              <Line type="monotone" dataKey={metric} stroke={t.series[0]} strokeWidth={2} dot={{ r: 4, fill: t.series[0], stroke: t.surface, strokeWidth: 2 }} activeDot={{ r: 6 }}>
                <LabelList dataKey={metric} position="top" formatter={trendFmt} fill={t.text} fontSize={11} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { title: 'Top positive themes', list: positive, key: 'positive' as const, icon: ThumbsUp, color: t.series[0] },
          { title: 'Top negative themes', list: negative, key: 'negative' as const, icon: ThumbsDown, color: t.series[7] },
        ].map(({ title, list, key, icon: Icon, color }) => {
          const max = Math.max(1, ...list.map((x) => x[key]));
          return (
            <Card key={key}>
              <CardHeader title={<span className="flex items-center gap-2"><Icon className="h-4 w-4" aria-hidden />{title}</span>} subtitle="Keyword grouping of comment sentences" />
              <CardBody>
                {!list.length ? (
                  <p className="text-sm muted">No {key} themes detected.</p>
                ) : (
                  <ul className="space-y-3">
                    {list.map((th) => (
                      <li key={th.theme}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium">{th.theme}</span>
                          <span className="tabular-nums muted">{th[key]} mention{th[key] > 1 ? 's' : ''}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-800">
                          <div className="h-full rounded-full" style={{ width: `${(th[key] / max) * 100}%`, background: color }} />
                        </div>
                        <p className="mt-1 truncate text-xs italic muted">“{th.examples[0]}”</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Comments" subtitle={`${comments.length} comments`} />
        <CardBody>
          <DataTable
            caption="Feedback comments"
            rows={comments}
            columns={commentColumns}
            rowKey={(f) => f.id}
            searchText={(f) => f.comment}
            searchPlaceholder="Search comments…"
            initialSort={{ key: 'date', dir: 'desc' }}
            pageSize={8}
            toolbar={
              <>
                <select className="input w-auto" aria-label="Filter by respondent role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="">All roles</option>
                  {RESPONDENT_ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <select className="input w-auto" aria-label="Filter by tone" value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value)}>
                  <option value="">All tones</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </>
            }
          />
        </CardBody>
      </Card>
      {adding && <FeedbackForm program={program} onClose={() => setAdding(false)} />}
    </div>
  );
}
