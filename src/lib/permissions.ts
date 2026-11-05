/**
 * Who may do what. Admins can do everything; what schedulers and instructors
 * may do is set on the Permissions page and stored in RolePermission rows.
 * This file has no database access so client components can use it too.
 */

export const ROLES = ['ADMIN', 'SCHEDULER', 'INSTRUCTOR'] as const;
export type Role = (typeof ROLES)[number];

/** Roles whose permissions an admin can change. */
export const EDITABLE_ROLES: Role[] = ['SCHEDULER', 'INSTRUCTOR'];

export const FEATURES = [
  {
    key: 'bookings.manage',
    label: 'Create, edit and cancel bookings',
    description: 'New Booking, editing and cancelling, and booking a free cell in the calendar.',
    defaults: { SCHEDULER: true, INSTRUCTOR: false },
  },
  {
    key: 'bookings.import',
    label: 'Import and export schedules',
    description: 'The Import / Export button on the Bookings page.',
    defaults: { SCHEDULER: true, INSTRUCTOR: false },
  },
  {
    key: 'reports',
    label: 'View reports',
    description: 'The Reports page and its Excel export.',
    defaults: { SCHEDULER: true, INSTRUCTOR: false },
  },
  {
    key: 'rooms.manage',
    label: 'Add, edit and remove rooms',
    description: 'Room management on the Rooms page.',
    defaults: { SCHEDULER: false, INSTRUCTOR: false },
  },
] as const;

export type Feature = (typeof FEATURES)[number]['key'];
export type Matrix = Record<Role, Record<Feature, boolean>>;

export function isFeature(v: string): v is Feature {
  return FEATURES.some((f) => f.key === v);
}

export function isRole(v: string | null | undefined): v is Role {
  return !!v && (ROLES as readonly string[]).includes(v);
}

/** The matrix with every role on its defaults; admins always on. */
export function defaultMatrix(): Matrix {
  const m = {} as Matrix;
  for (const role of ROLES) {
    m[role] = {} as Record<Feature, boolean>;
    for (const f of FEATURES) m[role][f.key] = role === 'ADMIN' ? true : (f.defaults as Record<string, boolean>)[role] ?? false;
  }
  return m;
}

export function isAllowed(matrix: Matrix | null | undefined, role: string | null | undefined, feature: Feature): boolean {
  if (!isRole(role)) return false;
  if (role === 'ADMIN') return true;
  return (matrix ?? defaultMatrix())[role][feature];
}
