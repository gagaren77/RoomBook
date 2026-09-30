import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { CampusesPageClient } from './CampusesPageClient';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { Navigation } from '@/components/layout/Navigation';

export default async function CampusesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AccessDenied />
          </div>
        </main>
      </div>
    );
  }

  return <CampusesPageClient />;
}
