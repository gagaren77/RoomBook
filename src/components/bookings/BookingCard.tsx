import React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ClockIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';
import { StatusBadge } from '@/components/ui/Badge';

interface BookingCardProps {
  booking: any;
  onClick: (booking: any) => void;
}

export function BookingCard({ booking, onClick }: BookingCardProps) {
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  
  return (
    <div 
      className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 transition-all hover:shadow-md hover:border-blue-300 cursor-pointer"
      onClick={() => onClick(booking)}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-medium text-gray-900 truncate pr-2 flex-1">
            {booking.title}
          </h3>
          <StatusBadge status={booking.status} />
        </div>
        
        <div className="space-y-2 mt-3">
          <div className="flex items-center text-sm text-gray-500">
            <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span>{format(startDate, 'MMM d, yyyy')}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span>{format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span className="truncate">{booking.room?.name} • {booking.room?.campus?.name}</span>
          </div>
          
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <span className="truncate max-w-[120px]">By {booking.user?.name}</span>
            </div>
            {booking.attendees && booking.attendees.length > 0 && (
              <div className="flex items-center text-xs text-gray-500">
                <UsersIcon className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                <span>{booking.attendees.length} attendees</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div 
        className="h-1 w-full" 
        style={{ backgroundColor: booking.color || '#3b82f6' }}
      />
    </div>
  );
}
