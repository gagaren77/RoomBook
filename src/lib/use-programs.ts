'use client';

import { useEffect, useState } from 'react';

let cache: string[] | null = null;
let pending: Promise<string[]> | null = null;

function load(): Promise<string[]> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch('/api/programs')
      .then((r) => (r.ok ? r.json() : { programs: [] }))
      .then((d) => (cache = Array.isArray(d.programs) ? d.programs : []))
      .catch(() => (cache = []));
  }
  return pending;
}

/** Forget the cached list, e.g. after an import added a program. */
export function invalidatePrograms() {
  cache = null;
  pending = null;
}

/** The sorted list of all programs with bookings; empty until loaded. */
export function usePrograms(): string[] {
  const [programs, setPrograms] = useState<string[]>(cache || []);
  useEffect(() => {
    let live = true;
    load().then((p) => live && setPrograms(p));
    return () => {
      live = false;
    };
  }, []);
  return programs;
}
