import './globals.css';
import { Toaster } from 'react-hot-toast';
import AuthSessionProvider from '@/components/providers/SessionProvider';

export const metadata = {
  title: 'Room calendar · Midwestern Career College',
  description: 'Room schedules for every Midwestern Career College campus.',
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
