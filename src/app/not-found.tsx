import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-center text-9xl font-extrabold text-blue-600">404</h2>
          <p className="mt-2 text-center text-2xl text-gray-900">Page not found</p>
          <p className="mt-2 text-center text-sm text-gray-500">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        <div className="mt-8">
          <Link href="/">
            <Button variant="primary" className="w-full sm:w-auto">
              Go back home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
