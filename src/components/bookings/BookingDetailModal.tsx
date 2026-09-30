import React, { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  UserIcon, 
  UsersIcon,
  EnvelopeIcon 
} from '@heroicons/react/24/outline';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function BookingDetailModal({ isOpen, onClose, booking, canEdit, onEdit, onDelete }: BookingDetailModalProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);

  if (!booking) return null;

  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);

  const handleSendInvites = async () => {
    setSendingInvites(true);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, method: 'both' }),
      });
      if (!res.ok) throw new Error('Failed to send invites');
      toast.success('Invitations sent successfully');
    } catch (error) {
      toast.error('Error sending invitations');
    } finally {
      setSendingInvites(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Booking Details" size="md">
        <div className="mt-2 space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="text-xl font-bold text-gray-900">{booking.title}</h4>
            <StatusBadge status={booking.status} />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start text-sm text-gray-600">
              <CalendarIcon className="mr-2 h-5 w-5 text-gray-400" />
              <span>{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            
            <div className="flex items-start text-sm text-gray-600">
              <ClockIcon className="mr-2 h-5 w-5 text-gray-400" />
              <span>{format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}</span>
            </div>
            
            <div className="flex items-start text-sm text-gray-600">
              <MapPinIcon className="mr-2 h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{booking.room?.name}</p>
                <p>{booking.room?.campus?.name}</p>
              </div>
            </div>
            
            <div className="flex items-start text-sm text-gray-600">
              <UserIcon className="mr-2 h-5 w-5 text-gray-400" />
              <span>Created by {booking.createdBy?.name || booking.createdBy?.email}</span>
            </div>
          </div>

          {booking.description && (
            <div className="pt-2 border-t border-gray-100">
              <h5 className="text-sm font-medium text-gray-900 mb-1">Description</h5>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{booking.description}</p>
            </div>
          )}

          {booking.attendees && booking.attendees.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h5 className="flex items-center text-sm font-medium text-gray-900">
                  <UsersIcon className="mr-2 h-4 w-4 text-gray-400" />
                  Attendees ({booking.attendees.length})
                </h5>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                {booking.attendees.map((attendee: any) => (
                  <li key={attendee.id}>{attendee.email}</li>
                ))}
              </ul>
            </div>
          )}

          {booking.outlookEventId && (
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
              Synced with Outlook (ID: {booking.outlookEventId.substring(0, 10)}...)
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:space-x-3 space-y-3 sm:space-y-0">
          <div className="flex space-x-3">
            {canEdit && (
              <>
                <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                  Delete
                </Button>
                <Button variant="secondary" onClick={onEdit}>
                  Edit
                </Button>
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={handleSendInvites} loading={sendingInvites}>
              <EnvelopeIcon className="mr-2 h-4 w-4" />
              Send Invites
            </Button>
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          setIsDeleteOpen(false);
          onClose();
          onDelete();
        }}
        title="Delete Booking"
        message="Are you sure you want to delete this booking? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
