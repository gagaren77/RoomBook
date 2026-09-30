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
      if (selectedCampusId && !selectedRoomId) {
        // If campus is selected but not room, we'd need to fetch all rooms for campus and filter
        // For simplicity in this UI, if they select a campus we just show all if no room selected
        // In a real app, API should support ?campusId= filter directly on bookings
      }
      
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
        throw new Error(error.message || 'Something went wrong');
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
    return isAdminOrScheduler || booking.userId === session?.user?.id;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Bookings"
            actions={
              <div className="flex items-center space-x-4">
                <div className="flex bg-white rounded-md shadow-sm border border-gray-200 p-0.5">
                  <button
                    onClick={() => setView('calendar')}
                    className={`p-1.5 rounded-md ${view === 'calendar' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <CalendarDaysIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`p-1.5 rounded-md ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
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

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
              <select
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[400px]">
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
