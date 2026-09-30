import React from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';

export function AccessDenied() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
        <LockClosedIcon className="h-8 w-8 text-red-600" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-500 max-w-md">
        You don't have permission to access this page. Please contact your administrator if you believe this is an error.
      </p>
    </div>
  );
}
