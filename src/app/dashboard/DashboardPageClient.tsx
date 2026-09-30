'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { format, startOfDay, endOfDay, addDays, isToday, isTomorrow } from 'date-fns';
import {
  PlusIcon,
  BuildingOffice2Icon,
  HomeModernIcon,
  CalendarDaysIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

export function DashboardPageClient() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({ campuses: 0, rooms: 0, today: 0, week: 0 });
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const weekEnd = endOfDay(addDays(now, 6));
        const monthEnd = endOfDay(addDays(now, 30));

        const [campusesRes, roomsRes, bookingsRes] = await Promise.all([
          fetch('/api/campuses'),
          fetch('/api/rooms'),
          fetch(`/api/bookings?start=${startOfDay(now).toISOString()}&end=${monthEnd.toISOString()}`),
        ]);

        const campuses = campusesRes.ok ? await campusesRes.json() : [];
        const rooms = roomsRes.ok ? await roomsRes.json() : [];
        const bookings: any[] = bookingsRes.ok ? await bookingsRes.json() : [];

        const todayCount = bookings.filter((b) => isToday(new Date(b.startTime))).length;
        const weekCount = bookings.filter((b) => new Date(b.startTime) <= weekEnd).length;

        setStats({
          campuses: Array.isArray(campuses) ? campuses.length : 0,
          rooms: Array.isArray(rooms) ? rooms.length : 0,
          today: todayCount,
          week: weekCount,
        });
        setUpcoming(bookings.filter((b) => new Date(b.endTime) >= now).slice(0, 6));
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const firstName = (session?.user?.name || '').split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { name: "Today's bookings", value: stats.today, icon: CalendarDaysIcon, tone: 'bg-indigo-50 text-indigo-600' },
    { name: 'Next 7 days', value: stats.week, icon: ClockIcon, tone: 'bg-violet-50 text-violet-600' },
    { name: 'Rooms', value: stats.rooms, icon: HomeModernIcon, tone: 'bg-sky-50 text-sky-600' },
    { name: 'Campuses', value: stats.campuses, icon: BuildingOffice2Icon, tone: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Welcome banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-6 py-8 shadow-card sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-200">{format(new Date(), 'EEEE, MMMM d')}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {greeting}, {firstName}
                </h1>
                <p className="mt-2 text-indigo-100">Here&apos;s what&apos;s happening across your campuses.</p>
              </div>
              <Link href="/bookings">
                <Button variant="secondary" size="lg" className="border-transparent shadow-lg">
                  <PlusIcon className="h-5 w-5" />
                  New booking
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner className="h-8 w-8 text-indigo-600" />
            </div>
          ) : (
            <>
              <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {statCards.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <dd className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{item.value}</dd>
                    <dt className="mt-1 text-sm text-slate-500">{item.name}</dt>
                  </div>
                ))}
              </dl>

              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                {/* Upcoming */}
                <section className="rounded-2xl border border-slate-200/70 bg-white shadow-card lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h2 className="text-base font-semibold text-slate-900">Upcoming bookings</h2>
                    <Link
                      href="/bookings"
                      className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View calendar <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                  {upcoming.length === 0 ? (
                    <div className="px-6 py-14 text-center text-sm text-slate-500">
                      Nothing booked yet. Create the first booking to see it here.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {upcoming.map((b) => {
                        const start = new Date(b.startTime);
                        const end = new Date(b.endTime);
                        return (
                          <li key={b.id} className="flex items-center gap-4 px-6 py-4">
                            <div
                              className="h-10 w-1.5 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: b.color || '#6366f1' }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{b.title}</p>
                              <p className="truncate text-sm text-slate-500">
                                {b.room?.name} · {b.room?.campus?.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-900">{dayLabel(start)}</p>
                              <p className="text-sm text-slate-500">
                                {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* Quick actions */}
                <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card">
                  <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
                  <div className="mt-4 space-y-2">
                    {[
                      { href: '/bookings', label: 'View calendar', icon: CalendarDaysIcon },
                      { href: '/rooms', label: 'Browse rooms', icon: HomeModernIcon },
                      ...(session?.user?.role === 'ADMIN'
                        ? [{ href: '/campuses', label: 'Manage campuses', icon: BuildingOffice2Icon }]
                        : []),
                    ].map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
                      >
                        <action.icon className="h-5 w-5 text-slate-400 group-hover:text-indigo-500" />
                        {action.label}
                        <ArrowRightIcon className="ml-auto h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
