'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface BookingCalendarProps {
  bookings: any[];
  onEventClick: (booking: any) => void;
  onDateSelect?: (start: Date, end: Date) => void;
  onRangeChange?: (start: Date, end: Date) => void;
  /** When false the calendar is view-only (no click-to-book). */
  selectable?: boolean;
  isLoading?: boolean;
}

export function BookingCalendar({ bookings, onEventClick, onDateSelect, onRangeChange, selectable = true, isLoading }: BookingCalendarProps) {
  
  const events = bookings.map(booking => ({
    id: booking.id,
    // Full text is used by the List view; the grid views show only the short label.
    title: `${booking.title} (${booking.room?.name})`,
    start: booking.startTime,
    end: booking.endTime,
    backgroundColor: booking.color || '#6366f1',
    borderColor: booking.color || '#6366f1',
    extendedProps: { booking }
  }));

  // Keep calendar blocks compact: only the Term ID (or the title for bookings
  // without one). Everything else is in the tooltip and the click-through details.
  const renderEventContent = (arg: any) => {
    const booking = arg.event.extendedProps.booking;
    if (arg.view.type.startsWith('list')) return undefined; // default full row
    const label = booking.termId || booking.title;
    const tooltip = [booking.title, booking.room?.name, arg.timeText].filter(Boolean).join(' · ');
    return (
      <div className="h-full w-full overflow-hidden px-1 py-0.5 text-[11px] font-semibold leading-tight" title={tooltip}>
        <span className="block break-all">{label}</span>
      </div>
    );
  };

  const handleEventClick = (info: any) => {
    onEventClick(info.event.extendedProps.booking);
  };

  const handleDateSelect = (info: any) => {
    onDateSelect?.(info.start, info.end);
    let calendarApi = info.view.calendar;
    calendarApi.unselect();
  };

  return (
    <div className="relative rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card sm:p-6">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
          <LoadingSpinner className="h-8 w-8 text-blue-600" />
        </div>
      )}
      
      <div className="fc-theme-standard">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          initialView="timeGridWeek"
          editable={false}
          selectable={selectable && !!onDateSelect}
          selectMirror={true}
          dayMaxEvents={true}
          eventMaxStack={3}
          weekends={true}
          events={events}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          select={handleDateSelect}
          datesSet={(info) => onRangeChange?.(info.start, info.end)}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
            startTime: '07:00', // 7am
            endTime: '22:00', // 10pm
          }}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          height="auto"
          allDaySlot={false}
        />
      </div>
      
    </div>
  );
}
