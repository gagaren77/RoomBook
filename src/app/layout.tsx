import './globals.css';
import { Toaster } from 'react-hot-toast';
import AuthSessionProvider from '@/components/providers/SessionProvider';
import { BRAND } from '@/lib/branding';

export const metadata = {
  title: `${BRAND.name} · ${BRAND.org}`,
  description: `Room schedules for every ${BRAND.org} campus.`,
  icons: {
    icon: [
      { url: BRAND.icons.small, sizes: '32x32', type: 'image/png' },
      { url: BRAND.icons.large, sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: BRAND.icons.apple, sizes: '180x180', type: 'image/png' }],
  },
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
