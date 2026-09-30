import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { BookingForm } from './BookingForm';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  preselectedDate?: Date;
}

export function BookingModal({ isOpen, onClose, initialData, onSubmit, preselectedDate }: BookingModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Booking' : 'New Booking'}
      size="lg"
    >
      <BookingForm
        initialData={initialData}
        onSubmit={onSubmit}
        onCancel={onClose}
        preselectedDate={preselectedDate}
      />
    </Modal>
  );
}
