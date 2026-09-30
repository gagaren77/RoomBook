'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RoleBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const emptyForm = { name: '', email: '', password: '', role: 'INSTRUCTOR' };

function initials(name?: string | null, email?: string) {
  const source = (name || email || 'U').trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
}

export function UsersPageClient() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      setUsers(await res.json());
    } catch (error) {
      toast.error('Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const request = async (url: string, method: string, body?: any) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Something went wrong');
    }
    return res.json();
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/api/users', 'POST', formData);
      toast.success('User created');
      setIsAddOpen(false);
      setFormData(emptyForm);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    try {
      const body: any = { name: formData.name, role: formData.role };
      if (formData.password) body.password = formData.password;
      await request(`/api/users/${selectedUser.id}`, 'PATCH', body);
      toast.success('User updated');
      setIsEditOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await request(`/api/users/${selectedUser.id}`, 'DELETE');
      toast.success('User deleted');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const roleField = (
    <Select
      label="Role"
      id="role"
      value={formData.role}
      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
    >
      <option value="INSTRUCTOR">Instructor – can book rooms and manage own bookings</option>
      <option value="SCHEDULER">Scheduler – can manage all bookings</option>
      <option value="ADMIN">Admin – full access</option>
    </Select>
  );

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Users"
            subtitle="Create accounts, set roles and reset passwords."
            actions={
              <Button
                onClick={() => {
                  setFormData(emptyForm);
                  setIsAddOpen(true);
                }}
              >
                <PlusIcon className="h-5 w-5" />
                Add user
              </Button>
            }
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card">
            <div className="border-b border-slate-100 p-4">
              <input
                type="search"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner className="h-8 w-8 text-indigo-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<UsersIcon className="h-full w-full" />}
                  title={users.length === 0 ? 'No users yet' : 'No matches'}
                  description={users.length === 0 ? 'Add the first user to get started.' : 'Try a different search.'}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3">User</th>
                      <th className="px-3 py-3">Role</th>
                      <th className="px-3 py-3">Bookings</th>
                      <th className="px-3 py-3">Joined</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((user) => (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                              {initials(user.name, user.email)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {user.name || '—'}
                                {user.id === session?.user?.id && (
                                  <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>
                                )}
                              </p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {user._count?.bookings || 0}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setFormData({ name: user.name || '', email: user.email, password: '', role: user.role });
                                setIsEditOpen(true);
                              }}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                              Edit
                            </Button>
                            {user.id !== session?.user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteOpen(true);
                                }}
                              >
                                <TrashIcon className="h-4 w-4" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add user">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            id="add-name"
            label="Full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            id="add-email"
            label="Email (used to sign in)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            id="add-password"
            label="Temporary password"
            type="text"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            helperText="At least 8 characters. Share it with the user; they can change it from their profile."
            minLength={8}
            required
          />
          {roleField}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create user
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit user">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input id="edit-email" label="Email" value={formData.email} disabled readOnly />
          <Input
            id="edit-name"
            label="Full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          {roleField}
          <Input
            id="edit-password"
            label="Reset password (optional)"
            type="text"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Leave blank to keep the current password"
            helperText="Set a new temporary password if the user is locked out."
            minLength={8}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete user"
        message={`Delete ${selectedUser?.name || selectedUser?.email}? This cannot be undone. Users who already have bookings can't be deleted.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
