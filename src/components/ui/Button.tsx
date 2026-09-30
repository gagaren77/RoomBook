import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles = {
  primary:
    'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:from-indigo-500 hover:to-indigo-700 border-transparent',
  secondary: 'bg-white text-slate-700 border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300',
  danger: 'bg-rose-600 text-white border-transparent shadow-sm shadow-rose-600/20 hover:bg-rose-700',
  ghost: 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl border font-semibold transition-all duration-150',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 active:scale-[0.98]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && <LoadingSpinner className="h-4 w-4" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
