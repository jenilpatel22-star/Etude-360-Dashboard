export const ROLES = ['Admin', 'Program Coordinator', 'Trainer'] as const;
export type Role = (typeof ROLES)[number];

export interface Permissions {
  /** Create / edit programs */
  editPrograms: boolean;
  /** Create / edit activities, logistics, phases */
  editOperations: boolean;
  /** Record feedback */
  editFeedback: boolean;
  /** Delete any record */
  delete: boolean;
  /** Change budgets and reset demo data */
  manageBudget: boolean;
}

export const PERMISSIONS: Record<Role, Permissions> = {
  Admin: { editPrograms: true, editOperations: true, editFeedback: true, delete: true, manageBudget: true },
  'Program Coordinator': { editPrograms: true, editOperations: true, editFeedback: true, delete: false, manageBudget: false },
  Trainer: { editPrograms: false, editOperations: false, editFeedback: false, delete: false, manageBudget: false },
};
