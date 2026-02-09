import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModeProvider } from '@/contexts/ModeContext';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'SORTYAPP - Rooms & Draws',
  description: 'Participate in rooms and draws with credits.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ModeProvider>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </ModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
