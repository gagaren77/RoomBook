'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface BookingFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  preselectedDate?: Date;
}

const COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // green-500
  '#f59e0b', // yellow-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#64748b', // slate-500
];

export function BookingForm({ initialData, onSubmit, onCancel, preselectedDate }: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    campusId: initialData?.room?.campusId || '',
    roomId: initialData?.roomId || '',
    date: initialData?.startTime ? format(new Date(initialData.startTime), 'yyyy-MM-dd') : preselectedDate ? format(preselectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: initialData?.startTime ? format(new Date(initialData.startTime), 'HH:mm') : preselectedDate ? format(preselectedDate, 'HH:mm') : '09:00',
    endTime: initialData?.endTime ? format(new Date(initialData.endTime), 'HH:mm') : preselectedDate ? format(new Date(preselectedDate.getTime() + 60*60*1000), 'HH:mm') : '10:00',
    description: initialData?.description || '',
    notes: initialData?.notes || '',
    color: initialData?.color || COLORS[0],
  });

  const [attendees, setAttendees] = useState<string[]>(
    initialData?.attendees?.map((a: any) => a.email) || []
  );
  const [attendeeInput, setAttendeeInput] = useState('');

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const res = await fetch('/api/campuses');
        const data = await res.json();
        setCampuses(data);
        if (data.length > 0 && !formData.campusId) {
          setFormData(prev => ({ ...prev, campusId: data[0].id }));
        }
      } catch (error) {
        console.error('Failed to fetch campuses', error);
      }
    };
    fetchCampuses();
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      if (!formData.campusId) return;
      try {
        const res = await fetch(`/api/rooms?campusId=${formData.campusId}`);
        const data = await res.json();
        setRooms(data.filter((r: any) => r.isActive));
        if (data.length > 0 && !formData.roomId && !initialData?.roomId) {
          setFormData(prev => ({ ...prev, roomId: data[0].id }));
        }
      } catch (error) {
        console.error('Failed to fetch rooms', error);
      }
    };
    fetchRooms();
  }, [formData.campusId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'campusId') {
      setFormData(prev => ({ ...prev, roomId: '' })); // Reset room when campus changes
    }
  };

  const handleAddAttendee = () => {
    if (attendeeInput.trim() && attendeeInput.includes('@') && !attendees.includes(attendeeInput.trim())) {
      setAttendees([...attendees, attendeeInput.trim()]);
      setAttendeeInput('');
    }
  };

  const handleKeyDownAttendee = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAttendee();
    }
  };

  const removeAttendee = (email: string) => {
    setAttendees(attendees.filter(a => a !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const startTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endTime = new Date(`${formData.date}T${formData.endTime}:00`);
      
      const submitData = {
        title: formData.title,
        roomId: formData.roomId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        description: formData.description,
        notes: formData.notes,
        color: formData.color,
        attendees,
      };
      await onSubmit(submitData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Event Title *"
        name="title"
        value={formData.title}
        onChange={handleChange}
        required
        placeholder="e.g. Weekly Team Meeting"
      />
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Campus *</label>
          <select
            name="campusId"
            value={formData.campusId}
            onChange={handleChange}
            required
            className=""
          >
            <option value="" disabled>Select campus</option>
            {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Room *</label>
          <select
            name="roomId"
            value={formData.roomId}
            onChange={handleChange}
            required
            className=""
            disabled={!formData.campusId}
          >
            <option value="" disabled>Select room</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity} seats)</option>)}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Date *"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
        <Input
          label="Start Time *"
          name="startTime"
          type="time"
          step="900"
          value={formData.startTime}
          onChange={handleChange}
          required
        />
        <Input
          label="End Time *"
          name="endTime"
          type="time"
          step="900"
          value={formData.endTime}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Attendees</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {attendees.map(email => (
            <span key={email} className="inline-flex items-center rounded-full bg-blue-100 py-0.5 pl-2.5 pr-1 text-sm font-medium text-blue-700">
              {email}
              <button
                type="button"
                onClick={() => removeAttendee(email)}
                className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
              >
                <XMarkIcon className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex space-x-2">
          <input
            type="email"
            value={attendeeInput}
            onChange={(e) => setAttendeeInput(e.target.value)}
            onKeyDown={handleKeyDownAttendee}
            placeholder="email@example.com"
            className=""
          />
          <Button type="button" variant="secondary" onClick={handleAddAttendee}>
            Add
          </Button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
        <textarea
          name="description"
          rows={2}
          value={formData.description}
          onChange={handleChange}
          className=""
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Event Color</label>
        <div className="flex space-x-2">
          {COLORS.map(color => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full focus:outline-none ring-offset-2 ${formData.color === color ? 'ring-2 ring-gray-400' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData(prev => ({ ...prev, color }))}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? 'Update Booking' : 'Create Booking'}
        </Button>
      </div>
    </form>
  );
}
