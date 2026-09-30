import React from 'react';
import Link from 'next/link';
import { UsersIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface RoomCardProps {
  room: any;
  isAdmin: boolean;
  onEdit: (room: any) => void;
  onDelete: (room: any) => void;
}

export function RoomCard({ room, isAdmin, onEdit, onDelete }: RoomCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover flex flex-col">
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {room.name}
            </h3>
            <p className="mt-1 flex items-center text-sm text-gray-500">
              <span className="font-medium mr-1 text-gray-700">{room.campus?.name}</span>
              {room.building && <span> • {room.building}</span>}
              {room.floor && <span> • Fl {room.floor}</span>}
            </p>
          </div>
          <div className="flex-shrink-0 ml-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {room.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center text-sm text-gray-500">
          <UsersIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
          <span>Capacity: <span className="font-medium text-gray-900">{room.capacity}</span></span>
        </div>

        {room.description && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-2">{room.description}</p>
        )}

        {room.amenities && room.amenities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {room.amenities.map((amenity: string, idx: number) => (
              <span key={idx} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                <CheckBadgeIcon className="mr-1 h-3 w-3" aria-hidden="true" />
                {amenity}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center mt-auto">
        <Link href={`/bookings?roomId=${room.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-500">
          View Bookings &rarr;
        </Link>
        {isAdmin && (
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(room)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(room)}>
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
