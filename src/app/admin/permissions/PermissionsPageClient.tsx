'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckIcon } from '@heroicons/react/24/solid';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RoleBadge } from '@/components/ui/Badge';
import { EDITABLE_ROLES, FEATURES, Feature, Matrix, Role, defaultMatrix } from '@/lib/permissions';
import { invalidatePermissions } from '@/lib/use-permissions';

export function PermissionsPageClient() {
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [saved, setSaved] = useState<Matrix | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/permissions')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load permissions'))))
      .then((data) => {
        setMatrix(data.matrix);
        setSaved(data.matrix);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  const toggle = (role: Role, feature: Feature) =>
    setMatrix((m) => (m ? { ...m, [role]: { ...m[role], [feature]: !m[role][feature] } } : m));

  const dirty = !!matrix && !!saved && JSON.stringify(matrix) !== JSON.stringify(saved);

  const save = async () => {
    if (!matrix) return;
    setSaving(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matrix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      setMatrix(data.matrix);
      setSaved(data.matrix);
      invalidatePermissions();
      toast.success('Permissions saved. They apply the next time each page loads.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Permissions"
            subtitle="Choose what schedulers and instructors can do. Admins can always do everything; campuses and user accounts stay admin-only."
            actions={
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => setMatrix(defaultMatrix())} disabled={!matrix}>
                  Reset to defaults
                </Button>
                <Button onClick={save} loading={saving} disabled={!dirty}>
                  Save changes
                </Button>
              </div>
            }
          />

          <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-card">
            {!matrix ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner className="h-8 w-8 text-blue-600" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 sm:px-5">Feature</th>
                    <th className="hidden px-4 py-3 text-center sm:table-cell">
                      <RoleBadge role="ADMIN" />
                    </th>
                    {EDITABLE_ROLES.map((role) => (
                      <th key={role} className="px-1.5 py-3 text-center sm:px-4">
                        <RoleBadge role={role} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((f) => (
                    <tr key={f.key} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-4 sm:px-5">
                        <p className="font-semibold text-slate-900">{f.label}</p>
                        <p className="text-xs text-slate-500">{f.description}</p>
                      </td>
                      <td className="hidden px-4 py-4 text-center sm:table-cell" title="Admins can always do this">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                          <CheckIcon className="h-4 w-4" />
                        </span>
                      </td>
                      {EDITABLE_ROLES.map((role) => {
                        const on = matrix[role][f.key];
                        const id = `${role}-${f.key}`;
                        return (
                          <td key={role} className="px-1.5 py-4 text-center sm:px-4">
                            <input
                              id={id}
                              type="checkbox"
                              checked={on}
                              onChange={() => toggle(role, f.key)}
                              aria-label={`${role.toLowerCase()}s may ${f.label.toLowerCase()}`}
                              className="h-5 w-5 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {dirty && <p className="mt-3 text-sm text-amber-700">You have unsaved changes.</p>}
        </div>
      </main>
    </div>
  );
}
