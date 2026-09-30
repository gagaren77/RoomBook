import React from 'react';
import { cn } from '@/lib/utils';

type BadgeColor = 'purple' | 'blue' | 'green' | 'red' | 'yellow' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const colorStyles: Record<BadgeColor, string> = {
  purple: 'bg-purple-100 text-purple-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  gray: 'bg-gray-100 text-gray-800',
};

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colorStyles[color], className)}>
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, BadgeColor> = {
    ADMIN: 'purple',
    SCHEDULER: 'blue',
    INSTRUCTOR: 'green',
  };
  
  return <Badge color={colorMap[role] || 'gray'}>{role}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, BadgeColor> = {
    CONFIRMED: 'green',
    CANCELLED: 'red',
    PENDING: 'yellow',
  };
  
  return <Badge color={colorMap[status] || 'gray'}>{status}</Badge>;
}
