import React from 'react';
import Link from 'next/link';
import { BuildingOfficeIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface CampusCardProps {
  campus: any;
  isAdmin: boolean;
  onEdit: (campus: any) => void;
  onDelete: (campus: any) => void;
}

export function CampusCard({ campus, isAdmin, onEdit, onDelete }: CampusCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 transition-all hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <BuildingOfficeIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                <Link href={`/rooms?campusId=${campus.id}`} className="hover:text-blue-600">
                  {campus.name}
                </Link>
              </h3>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <span className="font-medium mr-1">{campus._count?.rooms || 0}</span> rooms
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {campus.address && (
            <div className="flex items-start text-sm text-gray-500">
              <MapPinIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
              <span>
                {campus.address}
                <br />
                {campus.city}, {campus.state} {campus.zipCode}
              </span>
            </div>
          )}
          {campus.phone && (
            <div className="flex items-center text-sm text-gray-500">
              <PhoneIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
              <span>{campus.phone}</span>
            </div>
          )}
        </div>
      </div>
      
      {isAdmin && (
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="ghost" size="sm" onClick={() => onEdit(campus)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(campus)}>
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
