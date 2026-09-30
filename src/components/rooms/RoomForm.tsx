'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface RoomFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function RoomForm({ initialData, onSubmit, onCancel }: RoomFormProps) {
  const [loading, setLoading] = useState(false);
  const [campuses, setCampuses] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    campusId: initialData?.campusId || '',
    capacity: initialData?.capacity?.toString() || '30',
    floor: initialData?.floor || '',
    building: initialData?.building || '',
    description: initialData?.description || '',
    isActive: initialData?.isActive ?? true,
  });

  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities || []);
  const [amenityInput, setAmenityInput] = useState('');

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddAmenity = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && amenityInput.trim()) {
      e.preventDefault();
      if (!amenities.includes(amenityInput.trim())) {
        setAmenities([...amenities, amenityInput.trim()]);
      }
      setAmenityInput('');
    }
  };

  const removeAmenity = (amenityToRemove: string) => {
    setAmenities(amenities.filter(a => a !== amenityToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        capacity: parseInt(formData.capacity, 10),
        amenities,
      };
      await onSubmit(submitData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Room Name/Number *"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
        placeholder="e.g. Room 101"
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Campus *</label>
        <select
          name="campusId"
          value={formData.campusId}
          onChange={handleChange}
          required
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="" disabled>Select a campus</option>
          {campuses.map(campus => (
            <option key={campus.id} value={campus.id}>{campus.name}</option>
          ))}
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Capacity *"
          name="capacity"
          type="number"
          min="1"
          value={formData.capacity}
          onChange={handleChange}
          required
        />
        <Input
          label="Floor"
          name="floor"
          value={formData.floor}
          onChange={handleChange}
        />
      </div>

      <Input
        label="Building"
        name="building"
        value={formData.building}
        onChange={handleChange}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amenities</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {amenities.map(amenity => (
            <span key={amenity} className="inline-flex items-center rounded-full bg-blue-100 py-0.5 pl-2.5 pr-1 text-sm font-medium text-blue-700">
              {amenity}
              <button
                type="button"
                onClick={() => removeAmenity(amenity)}
                className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:bg-blue-500 focus:text-white focus:outline-none"
              >
                <span className="sr-only">Remove amenity</span>
                <XMarkIcon className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={amenityInput}
          onChange={(e) => setAmenityInput(e.target.value)}
          onKeyDown={handleAddAmenity}
          placeholder="Type and press Enter to add..."
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="flex items-center">
        <input
          id="isActive"
          name="isActive"
          type="checkbox"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
          Room is active and available for booking
        </label>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? 'Update Room' : 'Create Room'}
        </Button>
      </div>
    </form>
  );
}
