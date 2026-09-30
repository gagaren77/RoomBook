'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoleBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function ProfilePageClient() {
  const { update } = useSession();
  const [profile, setProfile] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setProfile(data);
        setName(data.name || '');
      } catch {
        toast.error('Could not load your profile');
      }
    };
    load();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not save your profile');
      }
      setProfile(await res.json());
      await update();
      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('The new passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not change your password');
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = (profile?.name || profile?.email || 'U')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <PageHeader title="My profile" subtitle="Update your details and keep your account secure." />

          {!profile ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner className="h-8 w-8 text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-8">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-semibold text-white shadow-sm">
                    {initials}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{profile.name || profile.email}</p>
                    <div className="mt-1">
                      <RoleBadge role={profile.role} />
                    </div>
                  </div>
                </div>

                <form onSubmit={saveProfile} className="space-y-4">
                  <Input
                    id="profile-name"
                    label="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    id="profile-email"
                    label="Email"
                    value={profile.email}
                    disabled
                    readOnly
                    helperText="Your email is your sign-in name. Ask an administrator if it needs to change."
                  />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" loading={savingProfile}>
                      Save changes
                    </Button>
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card sm:p-8">
                <h2 className="text-base font-semibold text-slate-900">Change password</h2>
                <p className="mt-1 text-sm text-slate-500">Use at least 8 characters.</p>

                <form onSubmit={savePassword} className="mt-6 space-y-4">
                  <Input
                    id="current-password"
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="new-password"
                      label="New password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <Input
                      id="confirm-password"
                      label="Confirm new password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" loading={savingPassword}>
                      Update password
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
