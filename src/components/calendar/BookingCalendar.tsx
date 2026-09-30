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
  onDateSelect: (start: Date, end: Date) => void;
  isLoading?: boolean;
}

export function BookingCalendar({ bookings, onEventClick, onDateSelect, isLoading }: BookingCalendarProps) {
  
  const events = bookings.map(booking => ({
    id: booking.id,
    title: `${booking.title} (${booking.room?.name})`,
    start: booking.startTime,
    end: booking.endTime,
    backgroundColor: booking.color || '#6366f1',
    borderColor: booking.color || '#6366f1',
    extendedProps: { booking }
  }));

  const handleEventClick = (info: any) => {
    onEventClick(info.event.extendedProps.booking);
  };

  const handleDateSelect = (info: any) => {
    onDateSelect(info.start, info.end);
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
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          eventClick={handleEventClick}
          select={handleDateSelect}
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
