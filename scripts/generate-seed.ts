/**
 * Deterministic seed-data generator.
 *
 *   npm run seed
 *
 * Writes src/data/seed.json. The PRNG is seeded, so the output is stable
 * between runs; change SEED or ANCHOR to get a different but consistent set.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Activity,
  ActivityStatus,
  ActivityType,
  Dataset,
  DeliveryMode,
  Dimension360,
  Feedback,
  Feedback360,
  LogisticsCategory,
  LogisticsItem,
  LogisticsStatus,
  Participant,
  PastRun,
  PhaseName,
  Program,
  ProgramCategory,
  ProgramStatus,
  RespondentGroup,
  Staff,
  StaffRole,
  TimelinePhase,
} from '../src/types/index.ts';

const SEED = 360;
/** "Today" for the generated data set. Statuses and progress are relative to this. */
const ANCHOR = new Date('2026-10-12T00:00:00Z');

// ---------------------------------------------------------------- utilities
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = <T>(arr: readonly T[], n: number): T[] => shuffle([...arr]).slice(0, n);
/** Approximately normal noise via sum of uniforms. */
const noise = (sd: number) => ((rand() + rand() + rand() + rand() - 2) / 0.577) * sd;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const score = (base: number, sd = 0.7) => clamp(Math.round(base + noise(sd)), 1, 5);
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

const DAY = 86_400_000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const isoDT = (d: Date, h: number, m = 0) => `${iso(d)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;
let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${String(++idCounter).padStart(4, '0')}`;

// ---------------------------------------------------------------- people
const FIRST = [
  'Amara', 'Ben', 'Chloé', 'Dev', 'Elena', 'Farid', 'Grace', 'Hiro', 'Isla', 'Jonas', 'Kavya', 'Liam',
  'Maya', 'Noah', 'Olu', 'Priya', 'Quinn', 'Rafael', 'Sofia', 'Tomás', 'Uma', 'Victor', 'Wen', 'Ximena',
  'Yusuf', 'Zara', 'Aisha', 'Bruno', 'Carmen', 'Daniel', 'Esther', 'Felix', 'Hana', 'Ivan', 'Julia',
  'Kofi', 'Lena', 'Marco', 'Nadia', 'Oscar', 'Paula', 'Rohan', 'Sana', 'Theo', 'Valentina', 'Wei',
  'Yara', 'Arjun', 'Beatriz', 'Ciaran', 'Dina', 'Emeka', 'Freya', 'Gabriel', 'Ingrid', 'Jamal', 'Keiko',
  'Leila', 'Mateo', 'Nia', 'Omar', 'Pia', 'Ravi', 'Selin', 'Tariq', 'Anouk', 'Bilal', 'Clara', 'Diego',
];
const LAST = [
  'Okafor', 'Schmidt', 'Dubois', 'Patel', 'Rossi', 'Haddad', 'Kim', 'Tanaka', 'MacLeod', 'Berg', 'Iyer',
  "O'Brien", 'Cohen', 'Silva', 'Adeyemi', 'Sharma', 'Novak', 'Moreno', 'Lindqvist', 'García', 'Mensah',
  'Petrov', 'Zhang', 'Hernández', 'Aydın', 'Khan', 'Nakamura', 'Fischer', 'Costa', 'Murphy', 'Ahmed',
  'Jansen', 'Kowalski', 'Ndlovu', 'Lopez', 'Nguyen', 'Wright', 'Andersen', 'Ibrahim', 'Rahman', 'Weber',
];
const usedNames = new Set<string>();
function personName(): string {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
  }
}
const emailFor = (name: string, domain: string) =>
  `${name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, '')
    .replace(' ', '.')}@${domain}`;

const SPECIALTIES: Record<ProgramCategory, string[]> = {
  Leadership: ['Executive presence', 'Coaching', 'Change leadership', 'Strategy'],
  Technical: ['Project management', 'Cloud platforms', 'Agile delivery', 'Systems design'],
  Compliance: ['Data protection', 'Anti-bribery', 'Risk & audit'],
  'Soft Skills': ['Negotiation', 'Presentation', 'Customer service', 'Facilitation'],
  Digital: ['Data analytics', 'Cybersecurity', 'AI literacy', 'Power BI'],
  'Health & Safety': ['First aid', 'Fire safety', 'Wellbeing'],
};
const CATEGORY_LIST = Object.keys(SPECIALTIES) as ProgramCategory[];

const staff: Staff[] = [];
const staffPlan: [StaffRole, number, string][] = [
  ['Trainer', 18, 'Learning & Development'],
  ['Coordinator', 10, 'Programme Office'],
  ['Manager', 6, 'Leadership Team'],
  ['Support', 6, 'Operations'],
];
for (const [role, count, dept] of staffPlan) {
  for (let i = 0; i < count; i++) {
    const name = personName();
    const cat = CATEGORY_LIST[i % CATEGORY_LIST.length];
    staff.push({
      id: `S${String(staff.length + 1).padStart(3, '0')}`,
      name,
      role,
      email: emailFor(name, 'etude360.org'),
      department: dept,
      specialties: role === 'Trainer' ? sample(SPECIALTIES[cat], 2) : [],
    });
  }
}
const trainers = staff.filter((s) => s.role === 'Trainer');
const coordinators = staff.filter((s) => s.role === 'Coordinator');
const support = staff.filter((s) => s.role === 'Support');
const trainersFor = (cat: ProgramCategory) =>
  trainers.filter((t) => t.specialties.some((sp) => SPECIALTIES[cat].includes(sp)));

// ---------------------------------------------------------------- programs
interface ProgramSpec {
  title: string;
  category: ProgramCategory;
  status: ProgramStatus;
  start: string;
  days: number; // calendar days incl. weekends
  mode: DeliveryMode;
  venue: string;
  capacity: number;
  fill: number; // enrolment ratio
  residential?: boolean;
  quality: { content: number; trainer: number; logistics: number; relevance: number };
  objectives: string[];
  description: string;
}

const specs: ProgramSpec[] = [
  {
    title: 'Presentation Skills Masterclass', category: 'Soft Skills', status: 'Completed', start: '2025-11-17', days: 2,
    mode: 'onsite', venue: 'Etude Learning Centre, London', capacity: 20, fill: 0.9,
    quality: { content: 4.1, trainer: 4.4, logistics: 3.9, relevance: 4.0 },
    objectives: ['Structure a persuasive narrative', 'Handle Q&A with confidence', 'Use visuals effectively'],
    description: 'Two-day practical masterclass with filmed practice presentations and individual coaching.',
  },
  {
    title: 'Emerging Leaders Programme', category: 'Leadership', status: 'Completed', start: '2026-02-09', days: 5,
    mode: 'hybrid', venue: 'Riverside Conference Hall, Manchester', capacity: 30, fill: 0.93,
    quality: { content: 4.4, trainer: 4.6, logistics: 3.7, relevance: 4.5 },
    objectives: ['Develop a personal leadership style', 'Lead high-performing teams', 'Give and receive feedback'],
    description: 'Flagship programme for first-time managers combining workshops, peer coaching and an action-learning project.',
  },
  {
    title: 'Data Privacy & GDPR Essentials', category: 'Compliance', status: 'Completed', start: '2026-04-14', days: 2,
    mode: 'virtual', venue: 'Microsoft Teams', capacity: 40, fill: 0.85,
    quality: { content: 3.9, trainer: 3.8, logistics: 4.2, relevance: 4.3 },
    objectives: ['Understand lawful bases for processing', 'Respond to subject access requests', 'Report a breach within 72 hours'],
    description: 'Mandatory compliance training covering GDPR principles, data subject rights and breach handling.',
  },
  {
    title: 'Advanced Excel & Power BI', category: 'Digital', status: 'Completed', start: '2026-06-08', days: 3,
    mode: 'onsite', venue: 'Tech Hub, Birmingham', capacity: 24, fill: 1,
    quality: { content: 4.5, trainer: 4.2, logistics: 3.4, relevance: 4.6 },
    objectives: ['Build dynamic dashboards', 'Model data with Power Query', 'Write DAX measures'],
    description: 'Hands-on lab programme taking analysts from advanced Excel to self-service BI.',
  },
  {
    title: 'Negotiation Mastery', category: 'Soft Skills', status: 'Completed', start: '2026-08-24', days: 2,
    mode: 'onsite', venue: 'Etude Learning Centre, London', capacity: 18, fill: 0.95,
    quality: { content: 4.2, trainer: 4.5, logistics: 4.1, relevance: 3.8 },
    objectives: ['Prepare a negotiation plan', 'Create and claim value', 'Manage difficult conversations'],
    description: 'Simulation-based programme with role-plays drawn from real procurement and partnership deals.',
  },
  {
    title: 'Project Management Professional Bootcamp', category: 'Technical', status: 'Ongoing', start: '2026-09-28', days: 26,
    mode: 'hybrid', venue: 'Riverside Conference Hall, Manchester', capacity: 25, fill: 0.88,
    quality: { content: 4.3, trainer: 4.0, logistics: 3.6, relevance: 4.4 },
    objectives: ['Master the PMBOK process groups', 'Prepare for the PMP exam', 'Apply hybrid delivery methods'],
    description: 'Four-week exam-preparation bootcamp with weekly mock exams and a capstone project plan.',
  },
  {
    title: 'Cloud Fundamentals (AWS & Azure)', category: 'Technical', status: 'Ongoing', start: '2026-10-05', days: 12,
    mode: 'virtual', venue: 'Zoom + cloud sandbox', capacity: 35, fill: 0.8,
    quality: { content: 4.0, trainer: 3.7, logistics: 3.3, relevance: 4.2 },
    objectives: ['Explain core cloud service models', 'Deploy a simple workload', 'Estimate and control cloud costs'],
    description: 'Vendor-neutral introduction with guided labs in AWS and Azure sandboxes.',
  },
  {
    title: 'Coaching for Managers', category: 'Leadership', status: 'Ongoing', start: '2026-10-08', days: 7,
    mode: 'hybrid', venue: 'Lakeside Retreat, Windermere', capacity: 16, fill: 1, residential: true,
    quality: { content: 4.5, trainer: 4.7, logistics: 4.3, relevance: 4.4 },
    objectives: ['Use the GROW model', 'Run effective 1:1s', 'Build a coaching culture'],
    description: 'Residential programme blending coaching practice triads with reflective learning journals.',
  },
  {
    title: 'Anti-Bribery & Business Ethics', category: 'Compliance', status: 'Upcoming', start: '2026-10-26', days: 2,
    mode: 'virtual', venue: 'Microsoft Teams', capacity: 40, fill: 0.75,
    quality: { content: 3.9, trainer: 3.9, logistics: 4.0, relevance: 4.1 },
    objectives: ['Recognise red flags', 'Apply the gifts & hospitality policy', 'Escalate concerns safely'],
    description: 'Scenario-led compliance session aligned to the UK Bribery Act and FCPA.',
  },
  {
    title: 'Agile & Scrum Practitioner', category: 'Technical', status: 'Upcoming', start: '2026-11-09', days: 5,
    mode: 'onsite', venue: 'Tech Hub, Birmingham', capacity: 24, fill: 0.71,
    quality: { content: 4.2, trainer: 4.2, logistics: 3.8, relevance: 4.3 },
    objectives: ['Run Scrum events', 'Write good user stories', 'Scale agile across teams'],
    description: 'Practitioner-level programme culminating in the PSM I certification exam.',
  },
  {
    title: 'Strategic Thinking for Senior Leaders', category: 'Leadership', status: 'Upcoming', start: '2026-11-23', days: 4,
    mode: 'onsite', venue: 'Lakeside Retreat, Windermere', capacity: 14, fill: 0.86, residential: true,
    quality: { content: 4.4, trainer: 4.5, logistics: 4.2, relevance: 4.5 },
    objectives: ['Scan and interpret the strategic environment', 'Make decisions under uncertainty', 'Translate strategy into action'],
    description: 'Residential executive programme with case studies, a business simulation and guest speakers.',
  },
  {
    title: 'Cybersecurity Awareness', category: 'Digital', status: 'Upcoming', start: '2026-12-07', days: 2,
    mode: 'hybrid', venue: 'Etude Learning Centre, London', capacity: 40, fill: 0.55,
    quality: { content: 4.0, trainer: 3.9, logistics: 3.9, relevance: 4.2 },
    objectives: ['Spot phishing and social engineering', 'Protect devices and data', 'Report incidents promptly'],
    description: 'Organisation-wide awareness programme including a live phishing simulation.',
  },
  {
    title: 'Customer Experience Excellence', category: 'Soft Skills', status: 'Potential', start: '2027-01-18', days: 3,
    mode: 'onsite', venue: 'TBC — Leeds', capacity: 24, fill: 0.4,
    quality: { content: 4.1, trainer: 4.1, logistics: 3.9, relevance: 4.0 },
    objectives: ['Map the customer journey', 'Handle complaints effectively', 'Measure CX with NPS and CES'],
    description: 'Proposed programme for front-line teams following the 2026 customer survey.',
  },
  {
    title: 'AI for Business Leaders', category: 'Digital', status: 'Potential', start: '2027-02-08', days: 2,
    mode: 'hybrid', venue: 'TBC', capacity: 30, fill: 0.5,
    quality: { content: 4.2, trainer: 4.1, logistics: 3.9, relevance: 4.5 },
    objectives: ['Identify high-value AI use cases', 'Understand risks and governance', 'Build an AI adoption roadmap'],
    description: 'Pipeline programme requested by the executive committee; awaiting budget approval.',
  },
  {
    title: 'Mental Health First Aid', category: 'Health & Safety', status: 'Potential', start: '2027-03-01', days: 2,
    mode: 'onsite', venue: 'TBC — Manchester', capacity: 16, fill: 0.6,
    quality: { content: 4.3, trainer: 4.3, logistics: 4.0, relevance: 4.4 },
    objectives: ['Recognise signs of mental ill health', 'Provide initial support', 'Signpost to professional help'],
    description: 'Accredited two-day course to create a network of mental health first aiders.',
  },
];

// ---------------------------------------------------------------- participants
const ORGS = ['Etude Group', 'Etude Consulting', 'Northwind Partners', 'Brightline Health', 'Civic Council', 'Atlas Logistics'];
const DEPTS = ['Finance', 'Operations', 'Sales', 'HR', 'IT', 'Marketing', 'Customer Service', 'Legal', 'Engineering', 'Procurement'];
const TITLES = ['Analyst', 'Team Lead', 'Manager', 'Senior Manager', 'Specialist', 'Officer', 'Consultant', 'Director', 'Coordinator', 'Engineer'];
const participants: Participant[] = [];
for (let i = 0; i < 200; i++) {
  const name = personName();
  const org = pick(ORGS);
  participants.push({
    id: `P${String(i + 1).padStart(3, '0')}`,
    name,
    email: emailFor(name, `${org.toLowerCase().replace(/[^a-z]/g, '')}.com`),
    organisation: org,
    department: pick(DEPTS),
    jobTitle: pick(TITLES),
    programIds: [],
  });
}

// ---------------------------------------------------------------- build
const programs: Program[] = [];
const activities: Activity[] = [];
const logistics: LogisticsItem[] = [];
const phases: TimelinePhase[] = [];
const feedback: Feedback[] = [];
const feedback360: Feedback360[] = [];

const VENDORS: Record<LogisticsCategory, string[]> = {
  venue: ['Riverside Venues Ltd', 'Lakeside Retreats', 'Etude Facilities', 'Tech Hub Spaces'],
  travel: ['TravelWise Corporate', 'RailEasy Business'],
  accommodation: ['Premier Stay Hotels', 'Lakeside Retreats', 'CityLodge Group'],
  catering: ['Fresh Fork Catering', 'Green Table Co.', 'Venue in-house catering'],
  'AV/tech': ['ProAV Solutions', 'StreamLine Events', 'Zoom Enterprise', 'Microsoft 365'],
  materials: ['PrintPoint', 'Etude Design Studio', 'LearnPack Supplies'],
  certificates: ['CertifyNow', 'Etude Design Studio', 'Accredible'],
};

const LOG_DESC: Record<LogisticsCategory, string[]> = {
  venue: ['Main training room hire', 'Breakout rooms (x3)', 'Plenary hall booking'],
  travel: ['Trainer rail travel', 'Participant travel allowance', 'Airport transfers'],
  accommodation: ['Participant rooms (B&B)', 'Trainer accommodation'],
  catering: ['Lunch & refreshments', 'Welcome dinner', 'Morning coffee breaks'],
  'AV/tech': ['Projector & sound system', 'Virtual platform licence', 'Hybrid camera kit & tech support', 'Lab sandbox credits'],
  materials: ['Participant workbooks', 'Case-study packs', 'Branded stationery', 'E-learning pre-work module'],
  certificates: ['Completion certificates', 'Digital badges', 'Exam vouchers'],
};

function logisticsCategoriesFor(spec: ProgramSpec): LogisticsCategory[] {
  if (spec.mode === 'virtual') return ['AV/tech', 'AV/tech', 'materials', 'materials', 'certificates'];
  const base: LogisticsCategory[] = ['venue', 'catering', 'catering', 'AV/tech', 'materials', 'materials', 'certificates'];
  if (spec.mode === 'hybrid') base.push('AV/tech', 'venue');
  if (spec.residential) base.push('accommodation', 'accommodation', 'travel');
  else if (chance(0.5)) base.push('travel');
  return base;
}

const COST_RANGE: Record<LogisticsCategory, [number, number]> = {
  venue: [1500, 6000],
  travel: [400, 2500],
  accommodation: [2000, 9000],
  catering: [800, 4000],
  'AV/tech': [300, 2500],
  materials: [250, 1800],
  certificates: [100, 900],
};

const SESSION_TOPICS = [
  'Opening & expectations', 'Core concepts', 'Case study deep-dive', 'Practice lab', 'Group exercise',
  'Expert panel', 'Tools & templates', 'Peer coaching triads', 'Action planning', 'Simulation round',
  'Reflection & review', 'Applying it at work',
];

const PHASE_SHAPE: { phase: PhaseName; from: (s: Date, e: Date) => Date; to: (s: Date, e: Date) => Date }[] = [
  { phase: 'Needs analysis', from: (s) => addDays(s, -84), to: (s) => addDays(s, -63) },
  { phase: 'Design', from: (s) => addDays(s, -62), to: (s) => addDays(s, -29) },
  { phase: 'Pre-work', from: (s) => addDays(s, -28), to: (s) => addDays(s, -1) },
  { phase: 'Delivery', from: (s) => s, to: (_s, e) => e },
  { phase: 'Assessment', from: (_s, e) => addDays(e, 1), to: (_s, e) => addDays(e, 10) },
  { phase: 'Post-training follow-up', from: (_s, e) => addDays(e, 11), to: (_s, e) => addDays(e, 70) },
];
const MILESTONES: Partial<Record<PhaseName, string>> = {
  'Needs analysis': 'Needs report signed off',
  Design: 'Design approved',
  'Pre-work': 'Joining instructions sent',
  Delivery: 'Programme launch',
  Assessment: 'Results published',
  'Post-training follow-up': '60-day impact review',
};

const POS: Record<string, string[]> = {
  trainer: [
    'The trainer was very knowledgeable and engaging throughout.',
    'Excellent facilitator — explained complex ideas clearly.',
    'Loved the trainer’s real-world examples and energy.',
  ],
  content: [
    'Content was well structured and very relevant to my role.',
    'Great practical exercises that I can apply immediately.',
    'The case studies were realistic and thought-provoking.',
  ],
  logistics: [
    'Venue was comfortable and the catering was excellent.',
    'Very well organised, joining instructions were clear.',
    'Smooth tech setup, no issues with the platform.',
  ],
  relevance: [
    'Directly applicable to my current projects.',
    'Highly relevant — already using the templates at work.',
  ],
  networking: ['Really valued the networking with colleagues from other teams.', 'Great group discussions and peer learning.'],
};
const NEG: Record<string, string[]> = {
  trainer: [
    'The trainer rushed through some sections, pace was too fast.',
    'Facilitator read from slides too much; would like more interaction.',
  ],
  content: [
    'Some content was too theoretical and not practical enough.',
    'Materials were outdated in places and the workbook had errors.',
    'Too much content squeezed into the time available.',
  ],
  logistics: [
    'The room was too cold and the breakout spaces were cramped.',
    'Catering options were limited for dietary requirements.',
    'Audio problems on the virtual platform made it hard to follow.',
    'Joining instructions arrived late and the venue was hard to find.',
  ],
  relevance: ['Not all modules were relevant to my role.', 'Would prefer more industry-specific examples.'],
  networking: ['Little time for networking with other participants.'],
};
const NEUTRAL = [
  'Overall a useful programme.',
  'Good session, some parts could be shorter.',
  'Would recommend with minor improvements.',
  '',
  '',
];

const COMMENTS_360: Record<Dimension360, { pos: string; neg: string }> = {
  contentQuality: { pos: 'Content quality is consistently high and well researched.', neg: 'Content needs refreshing to reflect current practice.' },
  delivery: { pos: 'Delivery was engaging and well paced.', neg: 'Delivery style varied a lot between trainers.' },
  logistics: { pos: 'Logistics ran smoothly from booking to wrap-up.', neg: 'Logistics were last-minute; vendors received late confirmations.' },
  roiImpact: { pos: 'We can already see behaviour change in the team.', neg: 'Hard to see a measurable impact on performance yet.' },
  communication: { pos: 'Communication before and after the programme was clear.', neg: 'Communication about schedule changes was poor.' },
  responsiveness: { pos: 'The programme office responded quickly to every request.', neg: 'Queries took several days to get a response.' },
};

/** Group-specific bias: internal staff rate themselves higher (self-assessment inflation). */
const GROUP_BIAS: Record<RespondentGroup, Partial<Record<Dimension360, number>> & { all: number }> = {
  Participants: { all: 0 },
  Trainers: { all: 0.2, logistics: -0.3 },
  'Managers/Sponsors': { all: -0.15, roiImpact: -0.4, communication: -0.2 },
  'Internal staff': { all: 0.45, responsiveness: 0.2 },
  Vendors: { all: -0.1, communication: -0.5, responsiveness: -0.3 },
};
const GROUP_COUNTS: Record<RespondentGroup, [number, number]> = {
  Participants: [8, 14],
  Trainers: [2, 3],
  'Managers/Sponsors': [3, 5],
  'Internal staff': [3, 5],
  Vendors: [1, 3],
};

let participantCursor = 0;
const participantOrder = shuffle(participants);

specs.forEach((spec, idx) => {
  const id = `PRG-${String(idx + 1).padStart(3, '0')}`;
  const start = parse(spec.start);
  const end = addDays(start, spec.days - 1);
  const pool = trainersFor(spec.category);
  const trainerIds = sample(pool.length ? pool : trainers, spec.days > 5 ? 2 : chance(0.4) ? 2 : 1).map((t) => t.id);
  const coordinatorId = coordinators[idx % coordinators.length].id;

  // enrolment
  const enrolled = Math.max(4, Math.round(spec.capacity * spec.fill));
  const enrolledParticipants: Participant[] = [];
  for (let i = 0; i < enrolled; i++) {
    const p = participantOrder[participantCursor % participantOrder.length];
    participantCursor++;
    if (p.programIds.includes(id)) continue;
    p.programIds.push(id);
    enrolledParticipants.push(p);
  }

  // past runs (trend)
  const pastRuns: PastRun[] = [];
  const baseOverall = (spec.quality.content + spec.quality.trainer + spec.quality.logistics + spec.quality.relevance) / 4;
  if (spec.status !== 'Potential' || chance(0.3)) {
    const runs = randInt(2, 4);
    for (let r = runs; r >= 1; r--) {
      const runEnd = addDays(start, -r * randInt(150, 200));
      pastRuns.push({
        label: `Run ${runs - r + 1}`,
        endDate: iso(runEnd),
        participants: randInt(Math.round(spec.capacity * 0.6), spec.capacity),
        overall: +clamp(baseOverall - r * 0.12 + noise(0.12), 2.5, 5).toFixed(2),
        nps: Math.round(clamp((baseOverall - 3.4) * 45 - r * 4 + noise(6), -60, 90)),
        responseRate: +clamp(0.62 + noise(0.08), 0.35, 0.95).toFixed(2),
      });
    }
  }

  // ---------------- activities
  const deliveryDays: Date[] = [];
  for (let d = 0; d < spec.days; d++) {
    const day = addDays(start, d);
    if (!isWeekend(day)) deliveryDays.push(day);
  }
  const activityStatus = (when: Date): ActivityStatus => {
    if (spec.status === 'Potential') return 'Planned';
    if (when < ANCHOR) return chance(0.03) ? 'Cancelled' : 'Completed';
    return when.getTime() - ANCHOR.getTime() < 21 * DAY ? (chance(0.85) ? 'Confirmed' : 'Planned') : chance(0.4) ? 'Confirmed' : 'Planned';
  };
  const owners = [...trainerIds, coordinatorId];
  const location = (onsiteVenue: string) => (spec.mode === 'virtual' ? spec.venue : onsiteVenue);
  const pushActivity = (day: Date, h1: number, m1: number, h2: number, m2: number, type: ActivityType, title: string, ownerId: string, loc: string) => {
    activities.push({
      id: nextId('ACT'),
      programId: id,
      title,
      type,
      start: isoDT(day, h1, m1),
      end: isoDT(day, h2, m2),
      ownerId,
      location: loc,
      status: activityStatus(new Date(`${isoDT(day, h1, m1)}Z`)),
    });
  };
  const topics = shuffle(SESSION_TOPICS);
  deliveryDays.forEach((day, di) => {
    const isFirst = di === 0;
    const isLast = di === deliveryDays.length - 1;
    pushActivity(day, 9, 0, 10, 30, 'session', isFirst ? 'Welcome & programme kick-off' : topics[di % topics.length], pick(trainerIds), location(spec.venue));
    pushActivity(day, 11, 0, 12, 30, 'workshop', `Workshop: ${topics[(di + 3) % topics.length]}`, pick(trainerIds), location(spec.venue));
    if (isLast || (deliveryDays.length > 8 && di % 5 === 4)) {
      pushActivity(day, 14, 0, 16, 0, 'assessment', isLast ? 'Final assessment' : `Weekly mock exam ${Math.ceil((di + 1) / 5)}`, pick(trainerIds), location(spec.venue));
    } else if (spec.mode !== 'virtual' && (spec.category === 'Technical' || spec.category === 'Health & Safety' || spec.category === 'Leadership') && di === 1) {
      pushActivity(day, 13, 30, 16, 30, 'field visit', spec.category === 'Leadership' ? 'Site visit: partner organisation' : 'Field visit: operations centre', pick(owners), 'Off-site');
    } else {
      pushActivity(day, 13, 30, 15, 30, 'session', topics[(di + 6) % topics.length], pick(trainerIds), location(spec.venue));
    }
    if ((spec.residential && di < deliveryDays.length - 1) || (isFirst && spec.mode !== 'virtual')) {
      pushActivity(day, 18, 0, 20, 0, 'networking', isFirst ? 'Welcome reception' : 'Networking dinner', coordinatorId, location(spec.venue));
    }
  });

  // ---------------- logistics
  const cats = logisticsCategoriesFor(spec);
  const usedDesc = new Set<string>();
  for (const cat of cats) {
    const options = LOG_DESC[cat].filter((d) => !usedDesc.has(d) && !(spec.mode === 'virtual' && d === 'Projector & sound system'));
    if (!options.length) continue;
    const description = pick(options);
    usedDesc.add(description);
    const [lo, hi] = COST_RANGE[cat];
    const scale = cat === 'catering' || cat === 'accommodation' ? spec.days / 3 + 0.4 : 1;
    const planned = roundTo(randInt(lo, hi) * Math.min(scale, 3), 50);
    const dueOffset = cat === 'certificates' ? randInt(-3, 2) + spec.days : -randInt(7, 45);
    const dueDate = addDays(start, dueOffset);
    let status: LogisticsStatus;
    if (spec.status === 'Completed') status = 'Done';
    else if (spec.status === 'Potential') status = chance(0.15) ? 'Confirmed' : 'Pending';
    else if (dueDate < ANCHOR) status = chance(0.18) ? 'Pending' : chance(0.6) ? 'Done' : 'Confirmed';
    else status = chance(0.45) ? 'Confirmed' : 'Pending';
    const actualCost = status === 'Pending' ? null : roundTo(planned * (1 + noise(0.1) + (cat === 'catering' ? 0.06 : 0)), 10);
    logistics.push({
      id: nextId('LOG'),
      programId: id,
      category: cat,
      description,
      vendor: pick(VENDORS[cat]),
      plannedCost: planned,
      actualCost,
      dueDate: iso(dueDate),
      status,
    });
  }
  const logisticsTotal = logistics.filter((l) => l.programId === id).reduce((s, l) => s + l.plannedCost, 0);
  const trainerFees = trainerIds.length * deliveryDays.length * 950;
  const budget = roundTo((logisticsTotal + trainerFees) * (1.08 + rand() * 0.15), 500);

  // trainer fees as AV-neutral logistics? Track as materials-free line so cost breakdown is realistic.
  logistics.push({
    id: nextId('LOG'),
    programId: id,
    category: 'materials',
    description: 'Trainer fees & preparation',
    vendor: 'Etude Faculty',
    plannedCost: trainerFees,
    actualCost:
      spec.status === 'Completed'
        ? roundTo(trainerFees * (1 + noise(0.05)), 10)
        : spec.status === 'Ongoing'
          ? roundTo(trainerFees * 0.5, 10)
          : null,
    dueDate: iso(end),
    status: spec.status === 'Completed' ? 'Done' : spec.status === 'Potential' ? 'Pending' : 'Confirmed',
  });

  // ---------------- phases
  const lag = spec.status === 'Ongoing' || spec.status === 'Upcoming' ? (chance(0.5) ? randInt(15, 35) : 0) : 0;
  PHASE_SHAPE.forEach((shape, pi) => {
    const pStart = shape.from(start, end);
    const pEnd = shape.to(start, end);
    let pct: number;
    if (spec.status === 'Potential') {
      pct = pi === 0 ? randInt(20, 70) : pi === 1 ? randInt(0, 15) : 0;
    } else if (ANCHOR >= pEnd) {
      // finished window — mostly complete, but a lagging program may still have a delayed phase
      pct = lag && (pi === 2 || pi === 1) && spec.status !== 'Completed' ? 100 - lag : 100;
      if (spec.status === 'Completed' && pi === 5 && ANCHOR < addDays(pEnd, 0)) pct = 100;
    } else if (ANCHOR <= pStart) {
      pct = 0;
    } else {
      const expected = ((ANCHOR.getTime() - pStart.getTime()) / (pEnd.getTime() - pStart.getTime())) * 100;
      pct = Math.round(clamp(expected - lag + noise(4), 0, 99));
    }
    phases.push({
      id: nextId('PH'),
      programId: id,
      phase: shape.phase,
      startDate: iso(pStart),
      endDate: iso(pEnd),
      percentComplete: Math.round(pct),
      milestone: MILESTONES[shape.phase] ? { label: MILESTONES[shape.phase]!, date: iso(pEnd) } : undefined,
    });
  });

  // ---------------- feedback (completed + ongoing pulse)
  if (spec.status === 'Completed' || spec.status === 'Ongoing') {
    const respondRate = spec.status === 'Completed' ? 0.6 + rand() * 0.3 : 0.3 + rand() * 0.25;
    const q = spec.quality;
    const submittedBase = spec.status === 'Completed' ? addDays(end, 1) : addDays(ANCHOR, -7);
    const respondents = enrolledParticipants.filter(() => chance(respondRate));
    const managerCount = spec.status === 'Completed' ? randInt(2, 4) : 0;
    const total = respondents.length + managerCount;
    for (let i = 0; i < total; i++) {
      const role = i < respondents.length ? 'Participant' : 'Manager';
      const ratings = {
        content: score(q.content),
        trainer: score(q.trainer),
        logistics: score(q.logistics, 0.85),
        relevance: score(q.relevance + (role === 'Manager' ? -0.2 : 0)),
        overall: 0,
      };
      ratings.overall = clamp(
        Math.round((ratings.content + ratings.trainer + ratings.logistics + ratings.relevance) / 4 + noise(0.35)),
        1,
        5,
      );
      const nps = clamp(Math.round(ratings.overall * 2.1 - 0.8 + noise(1)), 0, 10);
      // comment: talk about strongest or weakest dimension
      const dims = (['content', 'trainer', 'logistics', 'relevance'] as const).map((d) => [d, ratings[d]] as const);
      const best = [...dims].sort((a, b) => b[1] - a[1])[0];
      const worst = [...dims].sort((a, b) => a[1] - b[1])[0];
      let comment = '';
      if (worst[1] <= 2 || (worst[1] <= 3 && chance(0.5))) comment = pick(NEG[worst[0]]);
      else if (best[1] >= 4 && chance(0.75)) comment = pick(POS[chance(0.15) ? 'networking' : best[0]]);
      else comment = pick(NEUTRAL);
      if (comment && chance(0.15) && worst[1] <= 3 && best[1] >= 4) comment = `${pick(POS[best[0]])} ${pick(NEG[worst[0]])}`;
      feedback.push({
        id: nextId('FB'),
        programId: id,
        respondentRole: role,
        submittedAt: iso(addDays(submittedBase, randInt(0, 6))),
        ratings,
        nps,
        comment,
      });
    }

    // ---------------- 360 feedback
    const dimBase: Record<Dimension360, number> = {
      contentQuality: q.content,
      delivery: q.trainer,
      logistics: q.logistics,
      roiImpact: (q.relevance + q.content) / 2 - 0.35,
      communication: 3.8 + noise(0.25),
      responsiveness: 3.9 + noise(0.25),
    };
    for (const group of Object.keys(GROUP_COUNTS) as RespondentGroup[]) {
      const [lo, hi] = GROUP_COUNTS[group];
      const n = spec.status === 'Ongoing' ? Math.max(1, Math.round(randInt(lo, hi) * 0.5)) : randInt(lo, hi);
      for (let i = 0; i < n; i++) {
        const bias = GROUP_BIAS[group];
        const scores = Object.fromEntries(
          (Object.keys(dimBase) as Dimension360[]).map((d) => [d, score(dimBase[d] + bias.all + (bias[d] ?? 0), 0.6)]),
        ) as Record<Dimension360, number>;
        const sorted = (Object.entries(scores) as [Dimension360, number][]).sort((a, b) => a[1] - b[1]);
        const comment = chance(0.55)
          ? sorted[0][1] <= 3
            ? COMMENTS_360[sorted[0][0]].neg
            : COMMENTS_360[sorted[sorted.length - 1][0]].pos
          : '';
        feedback360.push({
          id: nextId('F360'),
          programId: id,
          group,
          submittedAt: iso(addDays(spec.status === 'Completed' ? end : ANCHOR, spec.status === 'Completed' ? randInt(3, 30) : -randInt(0, 3))),
          scores,
          comment,
        });
      }
    }
  }

  programs.push({
    id,
    code: `${spec.category.slice(0, 3).toUpperCase()}-${String(26 + (idx % 3)).padStart(2, '0')}${String(idx + 1).padStart(2, '0')}`,
    title: spec.title,
    category: spec.category,
    status: spec.status,
    startDate: iso(start),
    endDate: iso(end),
    mode: spec.mode,
    venue: spec.venue,
    trainerIds,
    coordinatorId,
    capacity: spec.capacity,
    enrolled: enrolledParticipants.length,
    budget,
    objectives: spec.objectives,
    description: spec.description,
    pastRuns,
  });
});

// keep support staff referenced as activity owners for logistics-heavy items
activities
  .filter((a) => a.type === 'networking')
  .forEach((a, i) => {
    if (i % 3 === 0) a.ownerId = support[i % support.length].id;
  });

const dataset: Dataset = { programs, activities, logistics, phases, feedback, feedback360, staff, participants };

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/seed.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generatedFor: iso(ANCHOR), ...dataset }, null, 1));
console.log(
  `Seed written to ${out}\n` +
    Object.entries(dataset)
      .map(([k, v]) => `  ${k.padEnd(14)} ${v.length}`)
      .join('\n'),
);
