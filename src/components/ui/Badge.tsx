import React from 'react';
import { cn } from '@/lib/utils';

type BadgeColor = 'purple' | 'blue' | 'green' | 'red' | 'yellow' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const colorStyles: Record<BadgeColor, string> = {
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  blue: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  gray: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        colorStyles[color],
        className
      )}
    >
      {children}
    </span>
  );
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  SCHEDULER: 'Scheduler',
  INSTRUCTOR: 'Instructor',
};

export function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, BadgeColor> = {
    ADMIN: 'purple',
    SCHEDULER: 'blue',
    INSTRUCTOR: 'green',
  };

  return <Badge color={colorMap[role] || 'gray'}>{roleLabels[role] || role}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, BadgeColor> = {
    CONFIRMED: 'green',
    CANCELLED: 'red',
    PENDING: 'yellow',
  };
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : '';

  return <Badge color={colorMap[status] || 'gray'}>{label}</Badge>;
}
