'use client';

import React from 'react';
import { programColor, programOf } from '@/lib/programs';

/** How many bookings in view belong to each program. */
export function countPrograms(bookings: any[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const p = programOf(b);
    counts.set(p, (counts.get(p) || 0) + 1);
  }
  return counts;
}

interface ProgramLegendProps {
  counts: Map<string, number>;
  /** Sorted list of all programs, for stable colors. */
  programs: string[];
  hidden: Set<string>;
  onToggle: (program: string) => void;
  onShowAll?: () => void;
}

/** The programs in view, one chip each; click a chip to hide or show that program. */
export function ProgramLegend({ counts, programs, hidden, onToggle, onShowAll }: ProgramLegendProps) {
  const items = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (items.length === 0) return null;
  const hiddenCount = items.filter(([key]) => hidden.has(key)).length;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500">Programs:</span>
      {items.map(([key, count]) => {
        const off = hidden.has(key);
        const color = programColor(key, programs);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            aria-pressed={!off}
            title={off ? `Show ${key}` : `Hide ${key}`}
            style={off ? undefined : { backgroundColor: color.bg, color: color.fg }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold transition ${
              off ? 'border-slate-200 bg-white text-slate-400 line-through' : 'border-transparent'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: off ? '#cbd5e1' : color.dot }} />
            {key}
            <span className="font-normal opacity-70">{count}</span>
          </button>
        );
      })}
      {hiddenCount > 0 && onShowAll ? (
        <button type="button" onClick={onShowAll} className="font-medium text-indigo-600 hover:text-indigo-800">
          Show all
        </button>
      ) : (
        <span className="text-slate-400">Click a program to hide or show it.</span>
      )}
    </div>
  );
}
