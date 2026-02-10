'use client';

import { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  const balance = user ? (isDemoMode ? user.demoBalance : user.realBalance) : 0;

  return (
    <nav className="bg-brand-500 dark:bg-surface-dark-2 border-b border-brand-600 dark:border-surface-dark-3 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 md:h-16 items-center">
          {/* Left: Logo + desktop nav links */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/" className="flex items-center gap-2 text-lg md:text-xl font-bold text-white">
              <img src="/logo-192.png" alt="SORTYAPP" className="h-8 w-8 rounded-full" />
              <span className="hidden sm:inline">SORTYAPP</span>
            </Link>
            {/* Desktop nav links */}
            {user && (
              <div className="hidden md:flex items-center gap-4">
                <Link href="/rooms" className="text-sm text-white/80 hover:text-white">
                  {t('nav.rooms')}
                </Link>
                <Link href="/rankings" className="text-sm text-white/80 hover:text-white">
                  {t('rankings.title')}
                </Link>
                <Link href="/wallet" className="text-sm text-white/80 hover:text-white">
                  {t('nav.wallet')}
                </Link>
                {user.role === 'ADMIN' && (
                  <Link href="/admin" className="text-sm text-accent-gold hover:text-white">
                    {t('nav.admin')}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Balance - always visible when logged in */}
            {user && (
              <div className={`text-xs md:text-sm font-medium px-2 md:px-3 py-1 rounded ${
                isDemoMode ? 'bg-demo/20 text-demo-light' : 'bg-real/20 text-real-light'
              }`}>
                {balance.toLocaleString()} SC
              </div>
            )}

            {/* Desktop-only controls */}
            <div className="hidden md:flex items-center gap-3">
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

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-white p-1.5"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/20 bg-brand-600 dark:bg-surface-dark-3">
          <div className="px-4 py-3 space-y-3">
            {user ? (
              <>
                {/* User info */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{user.username}</span>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded ${
                    isDemoMode ? 'bg-demo/20 text-demo-light' : 'bg-real/20 text-real-light'
                  }`}>
                    {balance.toLocaleString()} SC
                  </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex rounded-lg overflow-hidden border border-white/30 w-fit">
                  <button
                    onClick={() => setMode('DEMO')}
                    className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                      isDemoMode
                        ? 'bg-demo text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    DEMO
                  </button>
                  <button
                    onClick={() => setMode('REAL')}
                    className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                      !isDemoMode
                        ? 'bg-real text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    REAL
                  </button>
                </div>

                {/* Nav links */}
                <div className="flex flex-col gap-2">
                  <Link href="/rooms" onClick={() => setMenuOpen(false)} className="text-sm text-white/80 hover:text-white py-1">
                    {t('nav.rooms')}
                  </Link>
                  <Link href="/rankings" onClick={() => setMenuOpen(false)} className="text-sm text-white/80 hover:text-white py-1">
                    {t('rankings.title')}
                  </Link>
                  <Link href="/wallet" onClick={() => setMenuOpen(false)} className="text-sm text-white/80 hover:text-white py-1">
                    {t('nav.wallet')}
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-sm text-accent-gold hover:text-white py-1">
                      {t('nav.admin')}
                    </Link>
                  )}
                </div>

                {/* Settings row */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/20">
                  <button
                    onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
                    className="text-xs font-semibold text-white/80 hover:text-white px-2 py-1 rounded border border-white/30"
                  >
                    {locale === 'es' ? 'EN' : 'ES'}
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="text-white/80 hover:text-white p-1 rounded"
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
                  <div className="flex-1" />
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="text-sm text-white/50 hover:text-white/80">
                    {t('nav.logout')}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm text-white/80 hover:text-white py-1">
                  {t('nav.login')}
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="text-sm bg-white text-brand-600 px-3 py-1.5 rounded font-medium hover:bg-white/90 text-center">
                  {t('nav.signup')}
                </Link>
                <div className="flex items-center gap-3 pt-2 border-t border-white/20">
                  <button
                    onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
                    className="text-xs font-semibold text-white/80 hover:text-white px-2 py-1 rounded border border-white/30"
                  >
                    {locale === 'es' ? 'EN' : 'ES'}
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="text-white/80 hover:text-white p-1 rounded"
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
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
