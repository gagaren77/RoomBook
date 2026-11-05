import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { Navigation } from '@/components/layout/Navigation';
import { can } from '@/lib/permissions-server';
import { ReportsPageClient } from './ReportsPageClient';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (!(await can(session.user.role, 'reports'))) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AccessDenied />
          </div>
        </main>
      </div>
    );
  }

  return <ReportsPageClient />;
}
