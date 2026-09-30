import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(date: Date) {
  return format(date, "EEE, MMM d · h:mm a")
}

export function formatDate(date: Date) {
  return format(date, "EEE, MMM d, yyyy")
}

export function formatTime(date: Date) {
  return format(date, "h:mm a")
}

export function getRoleColor(role: string) {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'bg-red-100 text-red-800'
    case 'SCHEDULER':
      return 'bg-blue-100 text-blue-800'
    case 'INSTRUCTOR':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getRoleBadgeLabel(role: string) {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'Administrator'
    case 'SCHEDULER':
      return 'Scheduler'
    case 'INSTRUCTOR':
      return 'Instructor'
    default:
      return 'Unknown Role'
  }
}
