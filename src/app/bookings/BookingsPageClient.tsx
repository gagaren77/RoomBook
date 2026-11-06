'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, ListBulletIcon, CalendarDaysIcon, ArrowsUpDownIcon, TableCellsIcon, ViewColumnsIcon } from '@heroicons/react/24/outline';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { BookingCalendar } from '@/components/calendar/BookingCalendar';
import { RoomAvailability } from '@/components/calendar/RoomAvailability';
import { RoomTimetable } from '@/components/calendar/RoomTimetable';
import { CampusOverview } from '@/components/calendar/CampusOverview';
import { BookingCard } from '@/components/bookings/BookingCard';
import { BookingModal } from '@/components/bookings/BookingModal';
import { BookingDetailModal } from '@/components/bookings/BookingDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ImportExportModal } from '@/components/bookings/ImportExportModal';
import { usePermissions } from '@/lib/use-permissions';
import { invalidatePrograms } from '@/lib/use-programs';

type BookingsView = 'timetable' | 'rooms' | 'calendar' | 'list';
const VIEW_KEY = 'roombook.bookingsView';
const VIEWS: { id: BookingsView; label: string; title: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'timetable', label: 'Rooms by day', title: 'One row per room, one column per weekday', Icon: TableCellsIcon },
  { id: 'rooms', label: 'Room timeline', title: 'One day: one row per room, time left to right', Icon: ViewColumnsIcon },
  { id: 'calendar', label: 'Week', title: 'Classic week calendar', Icon: CalendarDaysIcon },
  { id: 'list', label: 'List', title: 'All bookings as cards', Icon: ListBulletIcon },
];

export function BookingsPageClient() {
  const { can } = usePermissions();
  const isAdminOrScheduler = can('bookings.manage');
  const canImport = can('bookings.import');
  
  // Each user picks how to see the calendar; the last choice is remembered in
  // this browser. Rooms by day is the default.
  const [view, setView] = useState<BookingsView>('timetable');
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY) as BookingsView | null;
      if (saved && VIEWS.some((v) => v.id === saved)) setView(saved);
    } catch {}
  }, []);
  const chooseView = (v: BookingsView) => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  // Programs hidden from the calendar views (legend chips), kept across views.
  const [hiddenPrograms, setHiddenPrograms] = useState<Set<string>>(new Set());
  const toggleProgram = (p: string) =>
    setHiddenPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  const showAllPrograms = () => setHiddenPrograms(new Set());
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
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Calendar view">
                  {VIEWS.map(({ id, label, title, Icon }) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={view === id}
                      onClick={() => chooseView(id)}
                      title={title}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                        view === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="hidden md:inline">{label}</span>
                    </button>
                  ))}
                </div>
                {canImport && (
                  <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
                    <ArrowsUpDownIcon className="-ml-1 h-5 w-5" />
                    Import / Export
                  </Button>
                )}
                {isAdminOrScheduler && (
                  <Button onClick={handleNewBooking}>
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    New Booking
                  </Button>
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

          {(view === 'timetable' || view === 'rooms') && !selectedCampusId ? (
            // "All Campuses" in a room view: one row per campus, click one to open its rooms.
            <CampusOverview campuses={campuses} onPickCampus={setSelectedCampusId} />
          ) : view === 'timetable' ? (
            <RoomTimetable
              campus={campuses.find((c) => c.id === selectedCampusId) || null}
              rooms={rooms}
              roomId={selectedRoomId}
              onEventClick={handleEventClick}
              onFreeSlotClick={isAdminOrScheduler ? handleFreeSlotClick : undefined}
              refreshKey={refreshKey}
              hiddenPrograms={hiddenPrograms}
              onToggleProgram={toggleProgram}
              onShowAllPrograms={showAllPrograms}
            />
          ) : view === 'rooms' ? (
            <RoomAvailability
              campus={campuses.find((c) => c.id === selectedCampusId) || null}
              rooms={rooms}
              roomId={selectedRoomId}
              onEventClick={handleEventClick}
              onFreeSlotClick={isAdminOrScheduler ? handleFreeSlotClick : undefined}
              refreshKey={refreshKey}
              hiddenPrograms={hiddenPrograms}
              onToggleProgram={toggleProgram}
              onShowAllPrograms={showAllPrograms}
            />
          ) : view === 'calendar' ? (
            <BookingCalendar
              bookings={bookings}
              onEventClick={handleEventClick}
              onDateSelect={isAdminOrScheduler ? handleDateSelect : undefined}
              selectable={isAdminOrScheduler}
              onRangeChange={(start, end) => setRange({ start, end })}
              isLoading={loading}
              hiddenPrograms={hiddenPrograms}
              onToggleProgram={toggleProgram}
              onShowAllPrograms={showAllPrograms}
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

      {canImport && (
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
