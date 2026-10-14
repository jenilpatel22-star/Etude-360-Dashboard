import { PHASES, type ID, type PhaseName, type TimelinePhase } from '@/types';
import { addDays, parseDate, toISODate } from './dates';

/** Default phase windows relative to programme start (s) and end (e), in days. */
const SHAPE: Record<PhaseName, (s: Date, e: Date) => [Date, Date]> = {
  'Needs analysis': (s) => [addDays(s, -84), addDays(s, -63)],
  Design: (s) => [addDays(s, -62), addDays(s, -29)],
  'Pre-work': (s) => [addDays(s, -28), addDays(s, -1)],
  Delivery: (s, e) => [s, e],
  Assessment: (_s, e) => [addDays(e, 1), addDays(e, 10)],
  'Post-training follow-up': (_s, e) => [addDays(e, 11), addDays(e, 70)],
};

const MILESTONES: Record<PhaseName, string> = {
  'Needs analysis': 'Needs report signed off',
  Design: 'Design approved',
  'Pre-work': 'Joining instructions sent',
  Delivery: 'Delivery complete',
  Assessment: 'Results published',
  'Post-training follow-up': '60-day impact review',
};

/** The six standard phases for a new programme, all at 0%. Editable afterwards. */
export function defaultPhases(programId: ID, startDate: string, endDate: string): Omit<TimelinePhase, 'id'>[] {
  const s = parseDate(startDate);
  const e = parseDate(endDate);
  return PHASES.map((phase) => {
    const [from, to] = SHAPE[phase](s, e);
    return {
      programId,
      phase,
      startDate: toISODate(from),
      endDate: toISODate(to),
      percentComplete: 0,
      milestone: { label: MILESTONES[phase], date: toISODate(to) },
    };
  });
}
