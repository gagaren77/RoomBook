'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface CampusFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function CampusForm({ initialData, onSubmit, onCancel }: CampusFormProps) {
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    phone: initialData?.phone || '',
    lat: initialData?.lat?.toString() || '',
    lng: initialData?.lng?.toString() || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
      };
      await onSubmit(submitData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Campus Name *"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
        placeholder="e.g. Main Campus"
      />
      
      <Input
        label="Address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        placeholder="123 Education St"
      />
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="City"
          name="city"
          value={formData.city}
          onChange={handleChange}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="State"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="IL"
          />
          <Input
            label="ZIP Code"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
          />
        </div>
      </div>
      
      <Input
        label="Phone Number"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        placeholder="(555) 123-4567"
      />

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {showAdvanced ? (
            <ChevronUpIcon className="h-4 w-4 mr-1" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 mr-1" />
          )}
          Map Coordinates (for future use)
        </button>
        
        {showAdvanced && (
          <div className="mt-3 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <Input
              label="Latitude"
              name="lat"
              type="number"
              step="any"
              value={formData.lat}
              onChange={handleChange}
              placeholder="41.8781"
            />
            <Input
              label="Longitude"
              name="lng"
              type="number"
              step="any"
              value={formData.lng}
              onChange={handleChange}
              placeholder="-87.6298"
            />
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? 'Update Campus' : 'Create Campus'}
        </Button>
      </div>
    </form>
  );
}
