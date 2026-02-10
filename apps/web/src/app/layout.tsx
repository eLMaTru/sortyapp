import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import Navbar from '@/components/Navbar';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import InstallPWA from '@/components/InstallPWA';
import ExpiredDrawNotification from '@/components/ExpiredDrawNotification';

export const metadata: Metadata = {
  title: 'SORTYAPP - Salas & Sorteos',
  description: 'Participa en salas de sorteo con créditos.',
  icons: {
    icon: '/favicon.png',
    apple: '/logo-192.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'SORTYAPP',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ModeProvider>
                <ServiceWorkerRegister />
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </main>
                <InstallPWA />
                <ExpiredDrawNotification />
              </ModeProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
