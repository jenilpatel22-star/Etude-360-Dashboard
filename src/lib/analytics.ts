/**
 * Pure aggregation functions. They take plain arrays (no React) so they are
 * easy to unit-test and could move server-side unchanged.
 */
import {
  DIMENSIONS_360,
  LOGISTICS_CATEGORIES,
  RATING_DIMENSIONS,
  RESPONDENT_GROUPS,
  type Dataset,
  type Dimension360,
  type Feedback,
  type Feedback360,
  type ID,
  type LogisticsItem,
  type Program,
  type RatingDimension,
  type RespondentGroup,
  type TimelinePhase,
} from '@/types';
import { diffDays, parseDate, quarterOf, today } from './dates';

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round2 = (v: number) => Math.round(v * 100) / 100;

// ------------------------------------------------------------------ budget & logistics
export const actualSpend = (items: LogisticsItem[]) => sum(items.map((l) => l.actualCost ?? 0));
export const plannedSpend = (items: LogisticsItem[]) => sum(items.map((l) => l.plannedCost));

export function budgetSummary(programs: Program[], logistics: LogisticsItem[]) {
  const ids = new Set(programs.map((p) => p.id));
  const items = logistics.filter((l) => ids.has(l.programId));
  return { allocated: sum(programs.map((p) => p.budget)), used: actualSpend(items), committed: plannedSpend(items) };
}

export const isOverdue = (l: LogisticsItem, ref = today()) => l.status === 'Pending' && diffDays(parseDate(l.dueDate), ref) < 0;
export const isDueSoon = (l: LogisticsItem, ref = today()) => {
  const d = diffDays(parseDate(l.dueDate), ref);
  return l.status === 'Pending' && d >= 0 && d <= 7;
};

/** Share of logistics items that are Confirmed or Done (0..1). */
export function readiness(items: LogisticsItem[]): number {
  if (!items.length) return 0;
  return items.filter((l) => l.status !== 'Pending').length / items.length;
}

export function costByCategory(items: LogisticsItem[]) {
  return LOGISTICS_CATEGORIES.map((category) => {
    const inCat = items.filter((l) => l.category === category);
    return { category, planned: plannedSpend(inCat), actual: actualSpend(inCat), count: inCat.length };
  }).filter((r) => r.count > 0);
}

// ------------------------------------------------------------------ timeline
export type PhaseHealth = 'complete' | 'on-track' | 'delayed' | 'not-started';

/** Expected % complete for a phase given today's date (linear). */
export function expectedProgress(p: TimelinePhase, ref = today()): number {
  const s = parseDate(p.startDate);
  const e = parseDate(p.endDate);
  if (ref < s) return 0;
  if (ref >= e) return 100;
  return (diffDays(ref, s) / Math.max(1, diffDays(e, s))) * 100;
}

export function phaseHealth(p: TimelinePhase, ref = today()): PhaseHealth {
  if (p.percentComplete >= 100) return 'complete';
  const expected = expectedProgress(p, ref);
  if (diffDays(parseDate(p.endDate), ref) < 0) return 'delayed';
  if (expected - p.percentComplete > 15) return 'delayed';
  if (p.percentComplete === 0 && expected === 0) return 'not-started';
  return 'on-track';
}

// ------------------------------------------------------------------ feedback
/** Net Promoter Score from 0–10 answers: %promoters (9–10) − %detractors (0–6). */
export function nps(scores: number[]): number {
  if (!scores.length) return NaN;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return ((promoters - detractors) / scores.length) * 100;
}

export function npsBreakdown(scores: number[]) {
  const n = scores.length || 1;
  return {
    promoters: scores.filter((s) => s >= 9).length / n,
    passives: scores.filter((s) => s >= 7 && s <= 8).length / n,
    detractors: scores.filter((s) => s <= 6).length / n,
  };
}

export function dimensionAverages(fb: Feedback[]): Record<RatingDimension, number> {
  return Object.fromEntries(RATING_DIMENSIONS.map((d) => [d, round2(mean(fb.map((f) => f.ratings[d])))])) as Record<
    RatingDimension,
    number
  >;
}

/** Count of 1..5 ratings per dimension, shaped for a stacked bar. */
export function scoreDistribution(fb: Feedback[]) {
  return RATING_DIMENSIONS.map((d) => {
    const row: Record<string, number | string> = { dimension: d };
    for (let s = 1; s <= 5; s++) row[`s${s}`] = fb.filter((f) => f.ratings[d] === s).length;
    return row;
  });
}

export function feedbackSummary(program: Program, fb: Feedback[]) {
  const participantResponses = fb.filter((f) => f.respondentRole === 'Participant').length;
  return {
    responses: fb.length,
    participantResponses,
    responseRate: program.enrolled ? Math.min(1, participantResponses / program.enrolled) : 0,
    averages: dimensionAverages(fb),
    nps: nps(fb.map((f) => f.nps)),
    npsBreakdown: npsBreakdown(fb.map((f) => f.nps)),
  };
}

// ------------------------------------------------------------------ comment themes
export const THEMES: Record<string, string[]> = {
  'Trainer & facilitation': ['trainer', 'facilitator', 'explained', 'energy', 'engaging', 'knowledgeable', 'slides'],
  'Content & materials': ['content', 'structured', 'case stud', 'material', 'workbook', 'theoretical', 'outdated', 'modules'],
  'Practical application': ['practical', 'apply', 'applicable', 'exercise', 'templates', 'using the'],
  'Relevance to role': ['relevant', 'my role', 'industry', 'projects'],
  'Pace & timing': ['pace', 'rushed', 'time available', 'shorter', 'squeezed', 'fast', 'too much'],
  'Venue & catering': ['venue', 'room', 'catering', 'dietary', 'cold', 'breakout', 'cramped'],
  'Technology & platform': ['audio', 'platform', 'tech setup', 'virtual'],
  'Organisation & comms': ['organised', 'instructions', 'late', 'communication', 'hard to find'],
  'Networking & peers': ['networking', 'peer', 'group discussions', 'colleagues', 'participants'],
};

const NEGATIVE_CUES = [
  'too ', 'not ', 'outdated', 'errors', 'rushed', 'limited', 'problems', 'hard ', 'late', 'cramped', 'cold',
  'little time', 'prefer', 'could be', 'poor', 'squeezed', 'read from slides',
];

export type Sentiment = 'positive' | 'negative' | 'neutral';

export function sentenceSentiment(sentence: string): Sentiment {
  const s = sentence.toLowerCase();
  if (NEGATIVE_CUES.some((c) => s.includes(c))) return 'negative';
  if (/(great|excellent|loved|very|clear|smooth|valued|comfortable|well|highly|already|realistic)/.test(s)) return 'positive';
  return 'neutral';
}

export function commentSentiment(f: Feedback): Sentiment {
  const parts = f.comment.split(/(?<=[.!?])\s+/).filter(Boolean).map(sentenceSentiment);
  if (parts.includes('negative') && !parts.includes('positive')) return 'negative';
  if (parts.includes('positive') && !parts.includes('negative')) return 'positive';
  if (parts.length === 0) return 'neutral';
  return f.ratings.overall >= 4 ? 'positive' : f.ratings.overall <= 2 ? 'negative' : 'neutral';
}

export interface ThemeCount {
  theme: string;
  positive: number;
  negative: number;
  examples: string[];
}

/** Keyword-based theme grouping, sentence by sentence so mixed comments count both ways. */
export function commentThemes(comments: string[]): ThemeCount[] {
  const out = new Map<string, ThemeCount>(
    Object.keys(THEMES).map((t) => [t, { theme: t, positive: 0, negative: 0, examples: [] }]),
  );
  for (const c of comments) {
    for (const sentence of c.split(/(?<=[.!?])\s+/).filter(Boolean)) {
      const lower = sentence.toLowerCase();
      const sentiment = sentenceSentiment(sentence);
      if (sentiment === 'neutral') continue;
      for (const [theme, keys] of Object.entries(THEMES)) {
        if (keys.some((k) => lower.includes(k))) {
          const row = out.get(theme)!;
          row[sentiment] += 1;
          if (row.examples.length < 3 && !row.examples.includes(sentence)) row.examples.push(sentence);
        }
      }
    }
  }
  return [...out.values()].filter((t) => t.positive + t.negative > 0);
}

// ------------------------------------------------------------------ 360
export function avg360(rows: Feedback360[]): Record<Dimension360, number> {
  return Object.fromEntries(DIMENSIONS_360.map((d) => [d, round2(mean(rows.map((r) => r.scores[d])))])) as Record<
    Dimension360,
    number
  >;
}

export const overall360 = (rows: Feedback360[]) => round2(mean(rows.flatMap((r) => DIMENSIONS_360.map((d) => r.scores[d]))));

export function groupByDimension(rows: Feedback360[]) {
  return RESPONDENT_GROUPS.map((group) => {
    const g = rows.filter((r) => r.group === group);
    return { group, n: g.length, scores: avg360(g) };
  }).filter((g) => g.n > 0);
}

export function programHeatmap(programs: Program[], rows: Feedback360[]) {
  return programs
    .map((p) => {
      const pr = rows.filter((r) => r.programId === p.id);
      return { program: p, n: pr.length, scores: avg360(pr), overall: overall360(pr) };
    })
    .filter((r) => r.n > 0);
}

export const INTERNAL_GROUPS: RespondentGroup[] = ['Internal staff'];
export const EXTERNAL_GROUPS: RespondentGroup[] = ['Participants', 'Managers/Sponsors'];

/** Self-assessment (internal staff) vs external perception, per dimension. */
export function gapAnalysis(rows: Feedback360[]) {
  const self = avg360(rows.filter((r) => INTERNAL_GROUPS.includes(r.group)));
  const ext = avg360(rows.filter((r) => EXTERNAL_GROUPS.includes(r.group)));
  return DIMENSIONS_360.map((d) => ({ dimension: d, self: self[d], external: ext[d], gap: round2(self[d] - ext[d]) }));
}

export function trainerLeaderboard(data: Dataset) {
  const trainers = data.staff.filter((s) => s.role === 'Trainer');
  return trainers
    .map((t) => {
      const programIds = new Set(data.programs.filter((p) => p.trainerIds.includes(t.id)).map((p) => p.id));
      const fb = data.feedback.filter((f) => programIds.has(f.programId));
      const f360 = data.feedback360.filter((f) => programIds.has(f.programId));
      return {
        trainer: t,
        programs: programIds.size,
        responses: fb.length,
        trainerScore: round2(mean(fb.map((f) => f.ratings.trainer))),
        overall: round2(mean(fb.map((f) => f.ratings.overall))),
        delivery360: round2(mean(f360.map((f) => f.scores.delivery))),
        nps: nps(fb.map((f) => f.nps)),
      };
    })
    .filter((r) => r.responses > 0)
    .sort((a, b) => b.trainerScore - a.trainerScore || b.responses - a.responses);
}

export function categoryPerformance(data: Dataset) {
  const cats = [...new Set(data.programs.map((p) => p.category))];
  return cats
    .map((category) => {
      const ids = new Set(data.programs.filter((p) => p.category === category).map((p) => p.id));
      const fb = data.feedback.filter((f) => ids.has(f.programId));
      const f360 = data.feedback360.filter((f) => ids.has(f.programId));
      return {
        category,
        overall: round2(mean(fb.map((f) => f.ratings.overall))),
        score360: overall360(f360),
        nps: Math.round(nps(fb.map((f) => f.nps))),
        responses: fb.length + f360.length,
      };
    })
    .filter((c) => c.responses > 0)
    .sort((a, b) => b.score360 - a.score360);
}

export function quarterlyTrend(data: Dataset) {
  const quarters = new Map<string, { fb: Feedback[]; f360: Feedback360[] }>();
  for (const f of data.feedback) {
    const q = quarterOf(f.submittedAt);
    if (!quarters.has(q)) quarters.set(q, { fb: [], f360: [] });
    quarters.get(q)!.fb.push(f);
  }
  for (const f of data.feedback360) {
    const q = quarterOf(f.submittedAt);
    if (!quarters.has(q)) quarters.set(q, { fb: [], f360: [] });
    quarters.get(q)!.f360.push(f);
  }
  return [...quarters.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, { fb, f360 }]) => ({
      quarter,
      overall: round2(mean(fb.map((f) => f.ratings.overall))),
      score360: overall360(f360),
      nps: Math.round(nps(fb.map((f) => f.nps))),
      responses: fb.length + f360.length,
    }));
}

// ------------------------------------------------------------------ auto summary
const ACTIONS: Record<Dimension360, string> = {
  contentQuality: 'Run a content refresh sprint: review case studies and workbooks annually with subject-matter experts.',
  delivery: 'Introduce peer observation and a facilitation masterclass for trainers scoring below 4.0.',
  logistics: 'Lock venue, catering and AV bookings ≥30 days before delivery and use a readiness checklist gate.',
  roiImpact: 'Agree success measures with sponsors up front and run 60-day impact reviews with line managers.',
  communication: 'Publish a single communication calendar per programme with automated joining instructions and change notices.',
  responsiveness: 'Set a 48-hour response SLA for the programme office and track it on a shared queue.',
};

export interface AutoSummary {
  strengths: { dimension: Dimension360; score: number; note: string }[];
  improvements: { dimension: Dimension360; score: number; note: string }[];
  actions: string[];
}

export function autoSummary(data: Dataset): AutoSummary {
  const all = avg360(data.feedback360);
  const ranked = (Object.entries(all) as [Dimension360, number][]).filter(([, v]) => Number.isFinite(v)).sort((a, b) => b[1] - a[1]);
  const gaps = gapAnalysis(data.feedback360);
  const groups = groupByDimension(data.feedback360);
  const heat = programHeatmap(data.programs, data.feedback360);

  const bestGroup = (d: Dimension360) => [...groups].sort((a, b) => b.scores[d] - a.scores[d])[0];
  const worstGroup = (d: Dimension360) => [...groups].sort((a, b) => a.scores[d] - b.scores[d])[0];
  const worstProgram = (d: Dimension360) => [...heat].sort((a, b) => a.scores[d] - b.scores[d])[0];

  const strengths = ranked.slice(0, 3).map(([dimension, score]) => {
    const g = bestGroup(dimension);
    return { dimension, score, note: `Rated highest by ${g.group.toLowerCase()} (${g.scores[dimension].toFixed(2)}).` };
  });
  const improvements = ranked
    .slice(-3)
    .reverse()
    .map(([dimension, score]) => {
      const g = worstGroup(dimension);
      const p = worstProgram(dimension);
      return {
        dimension,
        score,
        note: `Lowest with ${g.group.toLowerCase()} (${g.scores[dimension].toFixed(2)}); weakest programme: ${p.program.title} (${p.scores[dimension].toFixed(2)}).`,
      };
    });

  const actions = improvements.map((i) => ACTIONS[i.dimension]);
  const biggestGap = [...gaps].sort((a, b) => b.gap - a.gap)[0];
  if (biggestGap && biggestGap.gap > 0.3) {
    actions.push(
      `Close the perception gap on ${biggestGap.dimension === 'roiImpact' ? 'ROI / impact' : biggestGap.dimension}: internal staff rate it ${biggestGap.gap.toFixed(2)} points above participants and sponsors — validate with external data before reporting.`,
    );
  }
  return { strengths, improvements, actions };
}

export function programsById(programs: Program[]) {
  return new Map<ID, Program>(programs.map((p) => [p.id, p]));
}
