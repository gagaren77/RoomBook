'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CampusCard } from '@/components/campuses/CampusCard';
import { CampusForm } from '@/components/campuses/CampusForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

export function CampusesPageClient() {
  const [campuses, setCampuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<any | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [campusToDelete, setCampusToDelete] = useState<any | null>(null);

  const fetchCampuses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campuses');
      if (!res.ok) throw new Error('Failed to fetch campuses');
      const data = await res.json();
      setCampuses(data);
    } catch (error) {
      toast.error('Error loading campuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampuses();
  }, []);

  const handleAddCampus = () => {
    setEditingCampus(null);
    setIsFormModalOpen(true);
  };

  const handleEditCampus = (campus: any) => {
    setEditingCampus(campus);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (campus: any) => {
    setCampusToDelete(campus);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    const isEditing = !!editingCampus;
    const url = isEditing ? `/api/campuses/${editingCampus.id}` : '/api/campuses';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Something went wrong');
      }

      toast.success(isEditing ? 'Campus updated successfully' : 'Campus created successfully');
      setIsFormModalOpen(false);
      fetchCampuses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const confirmDelete = async () => {
    if (!campusToDelete) return;
    
    try {
      const res = await fetch(`/api/campuses/${campusToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Something went wrong');
      }

      toast.success('Campus deleted successfully');
      fetchCampuses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Campuses"
            subtitle="Manage school campuses and locations."
            actions={
              <Button onClick={handleAddCampus}>
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add Campus
              </Button>
            }
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner className="h-8 w-8 text-blue-600" />
            </div>
          ) : campuses.length === 0 ? (
            <EmptyState
              icon={<BuildingOfficeIcon className="h-full w-full" />}
              title="No campuses"
              description="Get started by creating a new campus location."
              action={
                <Button onClick={handleAddCampus}>
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  New Campus
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campuses.map((campus) => (
                <CampusCard
                  key={campus.id}
                  campus={campus}
                  isAdmin={true}
                  onEdit={handleEditCampus}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCampus ? 'Edit Campus' : 'Create New Campus'}
        size="lg"
      >
        <CampusForm
          initialData={editingCampus}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Campus"
        message={`Are you sure you want to delete "${campusToDelete?.name}"? This action cannot be undone and will fail if there are rooms associated with this campus.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
