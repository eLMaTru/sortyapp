'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { mode, setMode, isDemoMode } = useMode();
  const { isDark, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();

  const balance = user ? (isDemoMode ? user.demoBalance : user.realBalance) : 0;

  return (
    <nav className="bg-brand-500 dark:bg-surface-dark-2 border-b border-brand-600 dark:border-surface-dark-3 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-white">
              SORTYAPP
            </Link>
            {user && (
              <>
                <Link href="/rooms" className="text-sm text-white/80 hover:text-white">
                  {t('nav.rooms')}
                </Link>
                <Link href="/wallet" className="text-sm text-white/80 hover:text-white">
                  {t('nav.wallet')}
                </Link>
                {user.role === 'ADMIN' && (
                  <Link href="/admin" className="text-sm text-accent-gold hover:text-white">
                    {t('nav.admin')}
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="text-xs font-semibold text-white/80 hover:text-white px-2 py-1 rounded border border-white/30 hover:border-white/60 transition-colors"
            >
              {locale === 'es' ? 'EN' : 'ES'}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="text-white/80 hover:text-white p-1.5 rounded transition-colors"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {user && (
              <>
                {/* Mode Toggle */}
                <div className="flex rounded-lg overflow-hidden border border-white/30">
                  <button
                    onClick={() => setMode('DEMO')}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${
                      isDemoMode
                        ? 'bg-demo text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    DEMO
                  </button>
                  <button
                    onClick={() => setMode('REAL')}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${
                      !isDemoMode
                        ? 'bg-real text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    REAL
                  </button>
                </div>

                {/* Balance */}
                <div className={`text-sm font-medium px-3 py-1 rounded ${
                  isDemoMode ? 'bg-demo/20 text-demo-light' : 'bg-real/20 text-real-light'
                }`}>
                  {(balance / 100).toFixed(2)} USD
                </div>

                <span className="text-sm text-white/80">{user.username}</span>
                <button onClick={logout} className="text-sm text-white/50 hover:text-white/80">
                  {t('nav.logout')}
                </button>
              </>
            )}
            {!user && (
              <div className="flex gap-3">
                <Link href="/login" className="text-sm text-white/80 hover:text-white">
                  {t('nav.login')}
                </Link>
                <Link href="/register" className="text-sm bg-white text-brand-600 px-3 py-1 rounded font-medium hover:bg-white/90">
                  {t('nav.signup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
