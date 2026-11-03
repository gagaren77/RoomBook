'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { PlusIcon, ListBulletIcon, CalendarDaysIcon, ArrowsUpDownIcon, TableCellsIcon, ViewColumnsIcon } from '@heroicons/react/24/outline';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { BookingCalendar } from '@/components/calendar/BookingCalendar';
import { RoomAvailability } from '@/components/calendar/RoomAvailability';
import { RoomTimetable } from '@/components/calendar/RoomTimetable';
import { BookingCard } from '@/components/bookings/BookingCard';
import { BookingModal } from '@/components/bookings/BookingModal';
import { BookingDetailModal } from '@/components/bookings/BookingDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ImportExportModal } from '@/components/bookings/ImportExportModal';
import { canManageBookings } from '@/lib/permissions';
import { invalidatePrograms } from '@/lib/use-programs';

export function BookingsPageClient() {
  const { data: session } = useSession();
  const isAdminOrScheduler = canManageBookings(session?.user?.role);
  
  // The timetable (rooms by day) is the main view; the week calendar, the
  // room-by-hour grid and the list are the other tabs.
  const [view, setView] = useState<'timetable' | 'calendar' | 'rooms' | 'list'>('timetable');
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [preselectedRoom, setPreselectedRoom] = useState<{ id: string; campusId: string } | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  // Visible calendar range; the calendar view only loads bookings in this window.
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);

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
    setRefreshKey((k) => k + 1);
    if (view === 'rooms' || view === 'timetable') return; // those views load their own week or day
    setLoading(true);
    try {
      let url = '/api/bookings';
      const params = new URLSearchParams();
      if (selectedRoomId) params.append('roomId', selectedRoomId);
      if (selectedCampusId) params.append('campusId', selectedCampusId);
      if (view === 'calendar') {
        if (!range) return;
        params.append('start', range.start.toISOString());
        params.append('end', range.end.toISOString());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampusId, selectedRoomId, view, range?.start.getTime(), range?.end.getTime()]);

  // The room views need a campus; default to the first one.
  useEffect(() => {
    if ((view === 'rooms' || view === 'timetable') && !selectedCampusId && campuses.length) setSelectedCampusId(campuses[0].id);
  }, [view, selectedCampusId, campuses]);

  const handleNewBooking = () => {
    setEditingBooking(null);
    setPreselectedDate(undefined);
    setPreselectedRoom(undefined);
    setIsFormModalOpen(true);
  };

  const handleDateSelect = (start: Date) => {
    setEditingBooking(null);
    setPreselectedDate(start);
    setPreselectedRoom(undefined);
    setIsFormModalOpen(true);
  };

  const handleFreeSlotClick = (start: Date, room: { id: string }) => {
    setEditingBooking(null);
    setPreselectedDate(start);
    setPreselectedRoom({ id: room.id, campusId: selectedCampusId });
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

  // Only admins and schedulers can create, edit or cancel bookings; everyone else views.
  const canEditBooking = (booking: any) => !!booking && isAdminOrScheduler;

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
                    onClick={() => setView('timetable')}
                    title="Rooms by day"
                    aria-label="Rooms by day"
                    className={`rounded-lg p-2 transition ${view === 'timetable' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <TableCellsIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setView('calendar')}
                    title="Week calendar"
                    aria-label="Week calendar"
                    className={`rounded-lg p-2 transition ${view === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <CalendarDaysIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setView('rooms')}
                    title="Rooms by hour"
                    aria-label="Rooms by hour"
                    className={`rounded-lg p-2 transition ${view === 'rooms' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <ViewColumnsIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    title="List"
                    aria-label="List"
                    className={`rounded-lg p-2 transition ${view === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <ListBulletIcon className="h-5 w-5" />
                  </button>
                </div>
                {isAdminOrScheduler && (
                  <>
                    <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
                      <ArrowsUpDownIcon className="-ml-1 h-5 w-5" />
                      Import / Export
                    </Button>
                    <Button onClick={handleNewBooking}>
                      <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                      New Booking
                    </Button>
                  </>
                )}
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

          {view === 'timetable' ? (
            <RoomTimetable
              campus={campuses.find((c) => c.id === selectedCampusId) || null}
              rooms={rooms}
              roomId={selectedRoomId}
              onEventClick={handleEventClick}
              onFreeSlotClick={isAdminOrScheduler ? handleFreeSlotClick : undefined}
              refreshKey={refreshKey}
            />
          ) : view === 'rooms' ? (
            <RoomAvailability
              campus={campuses.find((c) => c.id === selectedCampusId) || null}
              rooms={rooms}
              roomId={selectedRoomId}
              onEventClick={handleEventClick}
              onFreeSlotClick={isAdminOrScheduler ? handleFreeSlotClick : undefined}
              refreshKey={refreshKey}
            />
          ) : view === 'calendar' ? (
            <BookingCalendar
              bookings={bookings}
              onEventClick={handleEventClick}
              onDateSelect={isAdminOrScheduler ? handleDateSelect : undefined}
              selectable={isAdminOrScheduler}
              onRangeChange={(start, end) => setRange({ start, end })}
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

      {isAdminOrScheduler && (
        <ImportExportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImported={() => {
            invalidatePrograms(); // an import may add a program
            fetchBookings();
          }}
          campusId={selectedCampusId}
          roomId={selectedRoomId}
        />
      )}

      <BookingModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={editingBooking}
        onSubmit={handleFormSubmit}
        preselectedDate={preselectedDate}
        preselectedRoom={preselectedRoom}
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
