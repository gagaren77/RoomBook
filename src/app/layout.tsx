import './globals.css';
import { Toaster } from 'react-hot-toast';
import AuthSessionProvider from '@/components/providers/SessionProvider';

export const metadata = {
  title: 'School Room Booking System',
  description: 'Manage and book school rooms easily.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full font-sans">
        <AuthSessionProvider>
          {children}
          <Toaster position="top-right" />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
