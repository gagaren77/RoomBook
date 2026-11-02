/** Roles allowed to create, edit, cancel, import and export bookings. */
export const BOOKING_MANAGER_ROLES = ['ADMIN', 'SCHEDULER'] as const;

export function canManageBookings(role?: string | null): boolean {
  return !!role && (BOOKING_MANAGER_ROLES as readonly string[]).includes(role);
}
