'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { PlusIcon, ListBulletIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { BookingCalendar } from '@/components/calendar/BookingCalendar';
import { BookingCard } from '@/components/bookings/BookingCard';
import { BookingModal } from '@/components/bookings/BookingModal';
import { BookingDetailModal } from '@/components/bookings/BookingDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function BookingsPageClient() {
  const { data: session } = useSession();
  const isAdminOrScheduler = session?.user?.role === 'ADMIN' || session?.user?.role === 'SCHEDULER';
  
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [bookings, setBookings] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>(undefined);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

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

  useEffect(() => {
    const fetchRooms = async () => {
      if (!selectedCampusId) {
        setRooms([]);
        setSelectedRoomId('');
        return;
      }
      try {
        const res = await fetch(`/api/rooms?campusId=${selectedCampusId}`);
        const data = await res.json();
        setRooms(data);
      } catch (error) {
        console.error('Error fetching rooms', error);
      }
    };
    fetchRooms();
  }, [selectedCampusId]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let url = '/api/bookings';
      const params = new URLSearchParams();
      if (selectedRoomId) params.append('roomId', selectedRoomId);
      if (selectedCampusId) params.append('campusId', selectedCampusId);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data);
    } catch (error) {
      toast.error('Error loading bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedCampusId, selectedRoomId]);

  const handleNewBooking = () => {
    setEditingBooking(null);
    setPreselectedDate(undefined);
    setIsFormModalOpen(true);
  };

  const handleDateSelect = (start: Date) => {
    setEditingBooking(null);
    setPreselectedDate(start);
    setIsFormModalOpen(true);
  };

  const handleEventClick = (booking: any) => {
    setSelectedBooking(booking);
    setIsDetailModalOpen(true);
  };

  const handleEditBooking = () => {
    setIsDetailModalOpen(false);
    setEditingBooking(selectedBooking);
    setIsFormModalOpen(true);
  };

  const handleDeleteBooking = async () => {
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Booking deleted');
      setIsDetailModalOpen(false);
      fetchBookings();
    } catch (error) {
      toast.error('Error deleting booking');
    }
  };

  const handleFormSubmit = async (data: any) => {
    const isEditing = !!editingBooking;
    const url = isEditing ? `/api/bookings/${editingBooking.id}` : '/api/bookings';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || 'Something went wrong');
      }

      toast.success(isEditing ? 'Booking updated successfully' : 'Booking created successfully');
      setIsFormModalOpen(false);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const canEditBooking = (booking: any) => {
    if (!booking) return false;
    return isAdminOrScheduler || booking.createdById === session?.user?.id;
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Bookings"
            actions={
              <div className="flex items-center gap-3">
                <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    onClick={() => setView('calendar')}
                    className={`rounded-lg p-2 transition ${view === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <CalendarDaysIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`rounded-lg p-2 transition ${view === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <ListBulletIcon className="h-5 w-5" />
                  </button>
                </div>
                <Button onClick={handleNewBooking}>
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  New Booking
                </Button>
              </div>
            }
          />

          <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Campus</label>
              <select
                className=""
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
              >
                <option value="">All Campuses</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>{campus.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Room</label>
              <select
                className=""
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                disabled={!selectedCampusId}
              >
                <option value="">All Rooms</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>
          </div>

          {view === 'calendar' ? (
            <BookingCalendar
              bookings={bookings}
              onEventClick={handleEventClick}
              onDateSelect={handleDateSelect}
              isLoading={loading}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card min-h-[400px]">
              {loading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner className="h-8 w-8 text-blue-600" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No bookings found for the selected filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {bookings.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onClick={handleEventClick}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <BookingModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={editingBooking}
        onSubmit={handleFormSubmit}
        preselectedDate={preselectedDate}
      />

      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        booking={selectedBooking}
        canEdit={canEditBooking(selectedBooking)}
        onEdit={handleEditBooking}
        onDelete={handleDeleteBooking}
      />
    </div>
  );
}
