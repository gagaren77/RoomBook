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
    backgroundColor: booking.color || '#3b82f6',
    borderColor: booking.color || '#3b82f6',
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
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-lg">
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
      
      <style jsx global>{`
        .fc .fc-button-primary {
          background-color: #ffffff;
          border-color: #d1d5db;
          color: #374151;
        }
        .fc .fc-button-primary:not(:disabled):active,
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #f3f4f6;
          border-color: #d1d5db;
          color: #111827;
        }
        .fc .fc-button-primary:hover {
          background-color: #f9fafb;
          border-color: #d1d5db;
          color: #111827;
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .fc-event {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
