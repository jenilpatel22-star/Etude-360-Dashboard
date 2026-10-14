import type { ID, Program, UserRole } from '@/types';

export interface Permissions {
  /** Programmes overview: create, edit and delete programmes (incl. budgets). */
  editPrograms: boolean;
  /** Record programme feedback and 360° responses. */
  editFeedback: boolean;
  /** Import activities into the Activity Depository from Excel, and remove them. */
  manageDepository: boolean;
  /** Manage user accounts and clear data. */
  manageUsers: boolean;
  /** No editing anywhere. */
  readOnly: boolean;
  /** Activities agenda of a programme. */
  editActivities: (p: Program) => boolean;
  /** Logistics checklist of a programme. */
  editLogistics: (p: Program) => boolean;
  /** Structure & timeline phases of a programme. */
  editTimeline: (p: Program) => boolean;
}

/**
 * Access rules:
 * - Admin: everything.
 * - Program Executive: activities, logistics, structure & timeline on every programme;
 *   imports to the Activity Depository.
 * - Trainer: activities on programmes they are assigned to.
 * - Trainee: view only.
 */
export function permissionsFor(role: UserRole | null, staffId?: ID): Permissions {
  const admin = role === 'Admin';
  const exec = role === 'Program Executive';
  const trainer = role === 'Trainer';
  return {
    editPrograms: admin,
    editFeedback: admin,
    manageUsers: admin,
    manageDepository: admin || exec,
    readOnly: role === 'Trainee' || role === null,
    editActivities: (p) => admin || exec || (trainer && !!staffId && p.trainerIds.includes(staffId)),
    editLogistics: () => admin || exec,
    editTimeline: () => admin || exec,
  };
}
