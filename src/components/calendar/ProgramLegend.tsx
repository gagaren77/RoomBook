'use client';

import { useMemo } from 'react';
import { programOf, programStyle } from '@/lib/programs';

interface ProgramLegendProps {
  bookings: any[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
}

/** One button per program in view: shows its color and class count, and click hides or shows it. */
export function ProgramLegend({ bookings, hidden, onChange }: ProgramLegendProps) {
  const programs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookings) {
      const p = programOf(b);
      counts.set(p, (counts.get(p) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [bookings]);

  if (programs.length === 0) return null;

  const toggle = (program: string) =>
    onChange(hidden.includes(program) ? hidden.filter((p) => p !== program) : [...hidden, program]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-700">Show:</span>
      {programs.map(([program, count]) => {
        const isHidden = hidden.includes(program);
        const style = programStyle(program);
        return (
          <button
            key={program}
            onClick={() => toggle(program)}
            aria-pressed={!isHidden}
            title={isHidden ? `Show ${program}` : `Hide ${program}`}
            style={isHidden ? undefined : { ...style }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              isHidden ? 'border-slate-200 bg-white text-slate-400 line-through' : ''
            }`}
          >
            {program} · {count}
          </button>
        );
      })}
      {hidden.length > 0 && (
        <button onClick={() => onChange([])} className="px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:underline">
          Show all
        </button>
      )}
    </div>
  );
}
