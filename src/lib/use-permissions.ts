'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Feature } from './permissions';

type Perms = { role: string; allowed: Record<Feature, boolean> };

let cache: Perms | null = null;
let inflight: Promise<Perms | null> | null = null;

function load(): Promise<Perms | null> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/permissions')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        cache = data ? { role: data.role, allowed: data.allowed } : null;
        return cache;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Call after an admin changes the matrix so every page asks again. */
export function invalidatePermissions() {
  cache = null;
}

/**
 * What the signed-in user may do. Admins are allowed everything at once;
 * other roles are allowed nothing until the server has answered.
 */
export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [perms, setPerms] = useState<Perms | null>(cache);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    load().then((p) => !cancelled && setPerms(p));
    return () => {
      cancelled = true;
    };
  }, [session]);

  const can = (feature: Feature): boolean => {
    if (role === 'ADMIN') return true;
    if (!perms || perms.role !== role) return false;
    return !!perms.allowed[feature];
  };

  return { can, loaded: role === 'ADMIN' || (!!perms && perms.role === role), role };
}
