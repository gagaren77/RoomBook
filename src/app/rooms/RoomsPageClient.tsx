'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RoomCard } from '@/components/rooms/RoomCard';
import { RoomForm } from '@/components/rooms/RoomForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

export function RoomsPageClient() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const searchParams = useSearchParams();
  const initialCampusId = searchParams?.get('campusId') || '';

  const [rooms, setRooms] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampusId, setSelectedCampusId] = useState(initialCampusId);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<any | null>(null);

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const res = await fetch('/api/campuses');
        const data = await res.json();
        setCampuses(data);
      } catch (error) {
        console.error('Error fetching campuses', error);
      }
    };
    fetchCampuses();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const url = selectedCampusId ? `/api/rooms?campusId=${selectedCampusId}` : '/api/rooms';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch rooms');
      const data = await res.json();
      setRooms(data);
    } catch (error) {
      toast.error('Error loading rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedCampusId]);

  const handleAddRoom = () => {
    setEditingRoom(null);
    setIsFormModalOpen(true);
  };

  const handleEditRoom = (room: any) => {
    setEditingRoom(room);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (room: any) => {
    setRoomToDelete(room);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    const isEditing = !!editingRoom;
    const url = isEditing ? `/api/rooms/${editingRoom.id}` : '/api/rooms';
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

      toast.success(isEditing ? 'Room updated successfully' : 'Room created successfully');
      setIsFormModalOpen(false);
      fetchRooms();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    
    try {
      const res = await fetch(`/api/rooms/${roomToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Something went wrong');
      }

      toast.success('Room deleted successfully');
      fetchRooms();
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
            title="Rooms"
            subtitle="View and manage bookable rooms across all campuses."
            actions={
              isAdmin ? (
                <Button onClick={handleAddRoom}>
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Add Room
                </Button>
              ) : null
            }
          />

          <div className="mb-6 flex items-center">
            <label className="mr-3 text-sm font-medium text-gray-700">Filter by Campus:</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm max-w-xs"
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
            >
              <option value="">All Campuses</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner className="h-8 w-8 text-blue-600" />
            </div>
          ) : rooms.length === 0 ? (
            <EmptyState
              title="No rooms found"
              description="There are no rooms matching your current filter criteria."
              action={
                isAdmin && (
                  <Button onClick={handleAddRoom}>
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    New Room
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isAdmin={isAdmin}
                  onEdit={handleEditRoom}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {isAdmin && (
        <>
          <Modal
            isOpen={isFormModalOpen}
            onClose={() => setIsFormModalOpen(false)}
            title={editingRoom ? 'Edit Room' : 'Create New Room'}
            size="lg"
          >
            <RoomForm
              initialData={editingRoom}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormModalOpen(false)}
            />
          </Modal>

          <ConfirmDialog
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={confirmDelete}
            title="Delete Room"
            message={`Are you sure you want to delete "${roomToDelete?.name}"? This action cannot be undone and will delete all associated bookings.`}
            confirmLabel="Delete"
            variant="danger"
          />
        </>
      )}
    </div>
  );
}
