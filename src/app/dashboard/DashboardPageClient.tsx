'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { PlusIcon, BuildingOffice2Icon, HomeIcon, CalendarDaysIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function DashboardPageClient() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalCampuses: 0,
    totalRooms: 0,
    todayBookings: 0,
    weekBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch these from a dedicated dashboard API endpoint
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Mock API calls - these would be replaced with actual dashboard stats endpoint
        const [campusesRes, roomsRes] = await Promise.all([
          fetch('/api/campuses').catch(() => ({ ok: false, json: () => [] })),
          fetch('/api/rooms').catch(() => ({ ok: false, json: () => [] })),
        ]);
        
        let totalCampuses = 0;
        let totalRooms = 0;
        
        if (campusesRes.ok) {
          const campuses = await campusesRes.json();
          totalCampuses = campuses.length;
        }
        
        if (roomsRes.ok) {
          const rooms = await roomsRes.json();
          totalRooms = rooms.length;
        }

        setStats({
          totalCampuses,
          totalRooms,
          todayBookings: Math.floor(Math.random() * 20), // Mock data
          weekBookings: Math.floor(Math.random() * 100) + 20, // Mock data
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { name: 'Total Campuses', stat: stats.totalCampuses, icon: BuildingOffice2Icon },
    { name: 'Total Rooms', stat: stats.totalRooms, icon: HomeIcon },
    { name: "Today's Bookings", stat: stats.todayBookings, icon: CalendarDaysIcon },
    { name: 'This Week', stat: stats.weekBookings, icon: ChartBarIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PageHeader
            title={`Welcome back, ${session?.user?.name || 'User'}`}
            subtitle="Here's what's happening today."
            actions={
              <Button onClick={() => window.location.href = '/bookings'}>
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                New Booking
              </Button>
            }
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner className="h-8 w-8 text-blue-600" />
            </div>
          ) : (
            <>
              <div>
                <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {statCards.map((item) => (
                    <div
                      key={item.name}
                      className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
                    >
                      <dt>
                        <div className="absolute rounded-md bg-blue-500 p-3">
                          <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                        </div>
                        <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
                      </dt>
                      <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                        <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-8 bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <Button variant="secondary" onClick={() => window.location.href = '/bookings'} className="w-full justify-start h-12">
                    <CalendarDaysIcon className="mr-3 h-5 w-5 text-gray-400" />
                    View Calendar
                  </Button>
                  <Button variant="secondary" onClick={() => window.location.href = '/rooms'} className="w-full justify-start h-12">
                    <HomeIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Browse Rooms
                  </Button>
                  {session?.user?.role === 'ADMIN' && (
                    <Button variant="secondary" onClick={() => window.location.href = '/campuses'} className="w-full justify-start h-12">
                      <BuildingOffice2Icon className="mr-3 h-5 w-5 text-gray-400" />
                      Manage Campuses
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
