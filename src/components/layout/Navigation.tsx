'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { RoleBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || 'U').trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
}

export function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === 'ADMIN';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Bookings', href: '/bookings' },
    { name: 'Rooms', href: '/rooms' },
    ...(isAdmin ? [{ name: 'Campuses', href: '/campuses' }, { name: 'Users', href: '/admin/users' }] : []),
  ];

  const avatar = (size: string) => (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-white shadow-sm',
        size
      )}
    >
      {initials(session?.user?.name, session?.user?.email)}
    </div>
  );

  return (
    <Disclosure
      as="nav"
      className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl"
    >
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-600/30">
                    <CalendarDaysIcon className="h-5 w-5" />
                  </span>
                  <span className="text-base font-bold tracking-tight text-slate-900">RoomBook</span>
                </Link>

                <div className="hidden items-center gap-1 sm:flex">
                  {navigation.map((item) => {
                    const isActive = pathname?.startsWith(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="hidden sm:flex sm:items-center">
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center gap-2 rounded-full p-1 pr-3 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25">
                    {avatar('h-8 w-8 text-xs')}
                    <span className="max-w-[140px] truncate text-sm font-medium text-slate-700">
                      {session?.user?.name || session?.user?.email}
                    </span>
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-150"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-100"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-40 mt-2 w-64 origin-top-right rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 focus:outline-none">
                      <div className="px-3 py-3">
                        <p className="truncate text-sm font-semibold text-slate-900">{session?.user?.name}</p>
                        <p className="mb-2 truncate text-xs text-slate-500">{session?.user?.email}</p>
                        <RoleBadge role={session?.user?.role || 'USER'} />
                      </div>
                      <div className="my-1 border-t border-slate-100" />
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/profile"
                            className={cn(
                              'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700',
                              active && 'bg-slate-100'
                            )}
                          >
                            <UserCircleIcon className="h-5 w-5 text-slate-400" />
                            My profile
                          </Link>
                        )}
                      </Menu.Item>
                      {isAdmin && (
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/admin/users"
                              className={cn(
                                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700',
                                active && 'bg-slate-100'
                              )}
                            >
                              <UsersIcon className="h-5 w-5 text-slate-400" />
                              Manage users
                            </Link>
                          )}
                        </Menu.Item>
                      )}
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700',
                              active && 'bg-slate-100'
                            )}
                          >
                            <ArrowRightOnRectangleIcon className="h-5 w-5 text-slate-400" />
                            Sign out
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>

              <div className="flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25">
                  <span className="sr-only">Open main menu</span>
                  {open ? <XMarkIcon className="block h-6 w-6" /> : <Bars3Icon className="block h-6 w-6" />}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="border-t border-slate-100 sm:hidden">
            <div className="space-y-1 px-3 py-3">
              {navigation.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Disclosure.Button
                    key={item.name}
                    as={Link}
                    href={item.href}
                    className={cn(
                      'block rounded-xl px-3 py-2.5 text-base font-medium',
                      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {item.name}
                  </Disclosure.Button>
                );
              })}
            </div>
            <div className="border-t border-slate-100 px-4 py-4">
              <div className="flex items-center gap-3">
                {avatar('h-10 w-10 text-sm')}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{session?.user?.name}</div>
                  <div className="truncate text-xs text-slate-500">{session?.user?.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Disclosure.Button
                  as={Link}
                  href="/profile"
                  className="block rounded-xl px-3 py-2 text-base font-medium text-slate-600 hover:bg-slate-100"
                >
                  My profile
                </Disclosure.Button>
                <Disclosure.Button
                  as="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="block w-full rounded-xl px-3 py-2 text-left text-base font-medium text-slate-600 hover:bg-slate-100"
                >
                  Sign out
                </Disclosure.Button>
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
