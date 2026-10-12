// Domain model for the Training Management Dashboard.
// All dates are ISO-8601 strings (YYYY-MM-DD, or full timestamps for activities).

export type ID = string;

export const PROGRAM_STATUSES = ['Upcoming', 'Ongoing', 'Potential', 'Completed'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const DELIVERY_MODES = ['onsite', 'virtual', 'hybrid'] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const PROGRAM_CATEGORIES = [
  'Leadership',
  'Technical',
  'Compliance',
  'Soft Skills',
  'Digital',
  'Health & Safety',
] as const;
export type ProgramCategory = (typeof PROGRAM_CATEGORIES)[number];

export const STAFF_ROLES = ['Trainer', 'Coordinator', 'Manager', 'Support'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface Staff {
  id: ID;
  name: string;
  role: StaffRole;
  email: string;
  department: string;
  specialties: string[];
}

export interface Participant {
  id: ID;
  name: string;
  email: string;
  organisation: string;
  department: string;
  jobTitle: string;
  programIds: ID[];
}

/** Summary of a previous run of the same program, used for trend comparisons. */
export interface PastRun {
  label: string;
  endDate: string;
  participants: number;
  overall: number; // average overall rating 1–5
  nps: number; // -100..100
  responseRate: number; // 0..1
}

export interface Program {
  id: ID;
  code: string;
  title: string;
  category: ProgramCategory;
  status: ProgramStatus;
  startDate: string;
  endDate: string;
  mode: DeliveryMode;
  venue: string;
  trainerIds: ID[];
  coordinatorId: ID;
  capacity: number;
  enrolled: number;
  budget: number; // allocated budget
  objectives: string[];
  description: string;
  pastRuns: PastRun[];
}

export const ACTIVITY_TYPES = ['session', 'workshop', 'assessment', 'field visit', 'networking'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = ['Planned', 'Confirmed', 'Completed', 'Cancelled'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export interface Activity {
  id: ID;
  programId: ID;
  title: string;
  type: ActivityType;
  start: string; // ISO date-time
  end: string; // ISO date-time
  ownerId: ID; // staff id
  location: string;
  status: ActivityStatus;
}

export const LOGISTICS_CATEGORIES = [
  'venue',
  'travel',
  'accommodation',
  'catering',
  'AV/tech',
  'materials',
  'certificates',
] as const;
export type LogisticsCategory = (typeof LOGISTICS_CATEGORIES)[number];

export const LOGISTICS_STATUSES = ['Pending', 'Confirmed', 'Done'] as const;
export type LogisticsStatus = (typeof LOGISTICS_STATUSES)[number];

export interface LogisticsItem {
  id: ID;
  programId: ID;
  category: LogisticsCategory;
  description: string;
  vendor: string;
  plannedCost: number;
  actualCost: number | null; // null until invoiced
  dueDate: string;
  status: LogisticsStatus;
}

export const PHASES = [
  'Needs analysis',
  'Design',
  'Pre-work',
  'Delivery',
  'Assessment',
  'Post-training follow-up',
] as const;
export type PhaseName = (typeof PHASES)[number];

export interface TimelinePhase {
  id: ID;
  programId: ID;
  phase: PhaseName;
  startDate: string;
  endDate: string;
  percentComplete: number; // 0..100
  milestone?: { label: string; date: string };
}

export const RESPONDENT_ROLES = ['Participant', 'Manager', 'Observer'] as const;
export type RespondentRole = (typeof RESPONDENT_ROLES)[number];

export const RATING_DIMENSIONS = ['content', 'trainer', 'logistics', 'relevance', 'overall'] as const;
export type RatingDimension = (typeof RATING_DIMENSIONS)[number];

export interface Feedback {
  id: ID;
  programId: ID;
  respondentRole: RespondentRole;
  submittedAt: string;
  ratings: Record<RatingDimension, number>; // 1..5
  nps: number; // 0..10 likelihood to recommend
  comment: string;
}

export const RESPONDENT_GROUPS = [
  'Participants',
  'Trainers',
  'Managers/Sponsors',
  'Internal staff',
  'Vendors',
] as const;
export type RespondentGroup = (typeof RESPONDENT_GROUPS)[number];

export const DIMENSIONS_360 = [
  'contentQuality',
  'delivery',
  'logistics',
  'roiImpact',
  'communication',
  'responsiveness',
] as const;
export type Dimension360 = (typeof DIMENSIONS_360)[number];

export interface Feedback360 {
  id: ID;
  programId: ID;
  group: RespondentGroup;
  submittedAt: string;
  scores: Record<Dimension360, number>; // 1..5
  comment: string;
}

export interface Dataset {
  programs: Program[];
  activities: Activity[];
  logistics: LogisticsItem[];
  phases: TimelinePhase[];
  feedback: Feedback[];
  feedback360: Feedback360[];
  staff: Staff[];
  participants: Participant[];
}

export type CollectionName = keyof Dataset;
export type EntityOf<C extends CollectionName> = Dataset[C][number];
