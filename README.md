# Etude 360 — Training Management Dashboard

A web dashboard for a training organisation. It covers the programme portfolio, delivery logistics, programme timelines, feedback reporting and an organisation-level 360° analysis.

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, React Router. PDF export uses jsPDF and html2canvas, which load only when you export.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Run the TypeScript project build only |

### First run

The dashboard starts **empty**: no programmes, no users. The first time it opens you're asked to create the **Admin** account (name, username, password). The Admin then:

1. Adds the other people on the **Users** page (Program Executives, Trainers and Trainees), choosing a username and an initial password for each and sharing it with them securely.
2. Creates programmes on **Programmes overview**. Each new programme gets the six standard timeline phases (Needs analysis → … → Post-training follow-up), dated from the programme's start and end. Program Executives can adjust them.

Everyone signs in with their own username and password. Use the menu under your name (top right) to change your password or sign out. Sessions last 12 hours. After five wrong passwords in a row, sign-in is blocked for 30 seconds.

Everything is stored in the browser's `localStorage`. **Users → Clear all data** wipes everything, including accounts, and returns to first-run setup.

## Modules

| Route | Module |
|---|---|
| `/` | **Programmes overview**: KPI cards (upcoming, ongoing, pipeline, completed this year, participants, budget used vs allocated). Upcoming / Ongoing / Potential board, with tabs on mobile and an optional Completed column. Filters for category, mode, trainer, date range and free-text search. Month and week calendar. |
| `/programs/:id/logistics` | **Activities & logistics**: activity agenda (sortable, filterable, paginated). Logistics checklist grouped by category; click a status badge to advance it. Readiness score (% confirmed or done), overdue and due-soon alerts, planned vs actual cost chart. |
| `/programs/:id/timeline` | **Structure & timeline**: Gantt of the six phases with milestones and a today marker. Delayed phases are flagged in red. Progress vs expected for each phase, plus a day-by-day delivery schedule. |
| `/programs/:id/feedback` | **Feedback report**: average score per dimension, NPS gauge with promoter/passive/detractor split, response rate, score distribution, trend vs previous runs, top positive and negative comment themes, and a comments table. Exports to **PDF** and **CSV**. |
| `/analysis` | **360° organisation analysis**: radar comparing stakeholder groups, programme × dimension heatmap, gap analysis (internal staff vs participants and sponsors), trainer leaderboard, category performance, quarter-over-quarter trend. Includes an auto-generated summary (top 3 strengths, top 3 improvement areas, recommended actions). Can be scoped to one category. Exports to **PDF**. |

### Roles and access

| | Programmes overview | Activities | Logistics | Structure & timeline | Feedback & 360° entry | Users |
|---|---|---|---|---|---|---|
| **Admin** | edit | edit | edit | edit | edit | manage |
| **Program Executive** | view | edit (all programmes) | edit | edit | view | – |
| **Trainer** | view | edit (assigned programmes only) | view | view | view | – |
| **Trainee** | view | view | view | view | view | – |

"Edit" includes adding and deleting records in that area. Only Admins create, edit or delete programmes (including budgets). A Trainer can edit activities only on programmes where they're listed as a trainer. Every role can see the reports and the 360° analysis.

The rules live in `src/lib/permissions.ts`. Sign-in and accounts are in `src/context/AuthContext.tsx` and `src/lib/auth.ts`.

### Security notes

- **Hashed passwords.** Passwords are never stored in plain text. They're hashed with PBKDF2-SHA256 (210,000 iterations, random 16-byte salt per account) using the browser's Web Crypto API.
- **Local-only data.** With the default local data source, all data, including the password hashes, lives in each browser's `localStorage`. Sign-in controls what the UI lets someone do. It doesn't stop someone with access to that browser's developer tools from reading or changing the stored data. Each browser also has its own separate set of users and programmes.
- **Real multi-user deployments.** For shared data across devices with enforced access control, move authentication and permission checks to a server (see *Connecting a real API*). The UI's role rules in `permissions.ts` map directly onto server-side checks.
- **Secure context required.** Web Crypto only works on `https://` or `localhost`, so serve the app from one of those.

### Forms

There are add and edit dialogs for users, programmes, activities, logistics items, timeline phases, feedback responses and 360° responses. Validation runs on submit; on error, focus moves to the first invalid field and the message is announced. Some examples of the rules:

- end date must not be before start date
- enrolled must not exceed capacity
- an item cannot be marked *Done* without an actual cost
- feedback cannot be dated in the future

## Project structure

```
src/
  types/                     domain schema (single source of truth)
  data/
    sources/DataSource.ts    data-access interface
    sources/localDataSource.ts  localStorage implementation (default, starts empty)
    sources/httpDataSource.ts   REST implementation for a real API
    DataProvider.tsx         React context: dataset + create/update/remove
  lib/
    analytics.ts             pure aggregation (NPS, readiness, gaps, themes, summary…)
    chartTheme.ts            validated categorical/sequential palettes, light & dark
    export.ts                CSV and PDF export
    dates.ts, format.ts, permissions.ts
  context/                   Theme (light/dark) and Role providers
  hooks/                     useForm, useCurrentProgram
  components/
    ui/                      Card, KpiCard, StatusBadge, DataTable, Modal, Tabs, Field, ProgressBar…
    charts/                  ChartCard (chart ⇄ table toggle), Legend, NpsGauge
    layout/                  AppLayout, Sidebar, Topbar
  features/
    overview/ logistics/ timeline/ feedback/ analysis/ program/ forms/
```

## Data schema

All types are defined in `src/types/index.ts`. Dates are ISO strings.

| Entity | Key fields |
|---|---|
| **Program** | `id, code, title, category, status (Upcoming \| Ongoing \| Potential \| Completed), startDate, endDate, mode (onsite \| virtual \| hybrid), venue, trainerIds[], coordinatorId, capacity, enrolled, budget, objectives[], description, pastRuns[]` |
| **PastRun** | `label, endDate, participants, overall, nps, responseRate` (used for trends vs previous runs) |
| **Activity** | `id, programId, title, type (session \| workshop \| assessment \| field visit \| networking), start, end, ownerId, location, status (Planned \| Confirmed \| Completed \| Cancelled)` |
| **LogisticsItem** | `id, programId, category (venue \| travel \| accommodation \| catering \| AV/tech \| materials \| certificates), description, vendor, plannedCost, actualCost \| null, dueDate, status (Pending \| Confirmed \| Done)` |
| **TimelinePhase** | `id, programId, phase (Needs analysis → Design → Pre-work → Delivery → Assessment → Post-training follow-up), startDate, endDate, percentComplete, milestone?` |
| **Feedback** | `id, programId, respondentRole, submittedAt, ratings {content, trainer, logistics, relevance, overall: 1–5}, nps (0–10), comment` |
| **Feedback360** | `id, programId, group (Participants \| Trainers \| Managers/Sponsors \| Internal staff \| Vendors), submittedAt, scores {contentQuality, delivery, logistics, roiImpact, communication, responsiveness: 1–5}, comment` |
| **Staff** | `id, name, role (Trainer \| Coordinator \| Manager \| Support), email, department, specialties[]` |
| **Participant** | `id, name, email, organisation, department, jobTitle, programIds[]` |
| **Account** | `id, username (unique, lower-case), displayName, email, role (Admin \| Program Executive \| Trainer \| Trainee), passwordHash, salt, iterations, staffId?, participantId?, active, createdAt` |

Each account is linked to a profile. An Admin is linked to a Staff record with role Manager, a Program Executive to Coordinator, and a Trainer to Trainer, so all three appear in programme and activity pickers. A Trainee is linked to a Participant record. Deleting an account keeps its profile, so programme history stays intact. To stop someone signing in, deactivate their account instead.

### Derived metrics

The formulas live in `src/lib/analytics.ts`:

- **Readiness**: logistics items that are Confirmed or Done ÷ all logistics items.
- **Overdue**: an item is overdue when it is still `Pending` and its `dueDate` is before today.
- **Delayed phase**: past its end date and below 100%, or more than 15 points behind the linear expected progress.
- **NPS**: % promoters (9–10) − % detractors (0–6).
- **Response rate**: participant responses ÷ enrolled.
- **Comment themes**: comments are split into sentences. Each sentence is matched to theme keyword lists and tagged positive or negative using cue words.
- **Gap analysis**: mean score from internal staff minus mean score from participants and managers/sponsors, per dimension.

## Connecting a real API

The UI only uses the `DataSource` interface, which has five methods: `load`, `create`, `update`, `remove` and `reset`. To point it at a backend:

```bash
# .env.local
VITE_DATA_SOURCE=http
VITE_API_URL=https://api.example.com
```

`HttpDataSource` expects REST endpoints of the form `GET/POST /:collection` and `PATCH/DELETE /:collection/:id`. The collections are `programs, activities, logistics, phases, feedback, feedback360, staff, participants`. Accounts aren't loaded from the API: with a backend, sign-in and password checks must happen on the server. For other backends (GraphQL, Supabase, …), implement `DataSource` and return it from `createDataSource()` in `src/data/sources/index.ts`.

## Accessibility & design notes

- Status badges always pair colour with an icon and a text label.
- Every chart has a **table view** toggle (the ⊞ icon).
- Charts use a colour-vision-deficiency-checked categorical palette with separate light and dark steps. Each stakeholder group keeps the same colour in every chart.
- Includes a skip link, labelled form controls, `aria-sort` on sortable columns, visible focus rings, and Esc to close dialogs.
- Responsive layout: the sidebar becomes a drawer below `lg`, the board switches to tabs on mobile, and wide tables and charts scroll horizontally.
