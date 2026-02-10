'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AmbientConfetti from '@/components/AmbientConfetti';
import { api } from '@/lib/api';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        // Try REAL first, fallback to DEMO
        let rankings = await api.draws.rankings('REAL');
        if (rankings.length === 0) {
          rankings = await api.draws.rankings('DEMO');
        }
        if (rankings.length === 0) return;

        const items: string[] = [];
        // Top player highlight
        if (rankings[0]) {
          items.push(`${t('ticker.topPlayer')}: ${rankings[0].username} - ${rankings[0].wins} ${t('ticker.wins')}`);
        }
        // Recent winners
        for (const r of rankings.slice(0, 8)) {
          if (r.totalWinnings > 0) {
            items.push(`${r.username} ${t('ticker.won')} ${r.totalWinnings.toLocaleString()} SC`);
          }
        }
        setTickerItems(items);
      } catch { /* ignore */ }
    };
    fetchTicker();
  }, [t]);

  return (
    <div className="text-center py-10 md:py-20 px-2">
      <AmbientConfetti />
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">{t('home.title')}</h1>
      <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg mb-8 max-w-xl mx-auto">
        {t('home.subtitle')}
      </p>

      {user ? (
        <div className="flex flex-col gap-3 justify-center items-center">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center">
            <Link
              href="/rooms"
              className="bg-brand-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-600 w-full sm:w-auto"
            >
              {t('home.browse')}
            </Link>
            <Link
              href="/wallet"
              className="border border-gray-300 dark:border-surface-dark-3 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-surface-dark-2 w-full sm:w-auto"
            >
              {t('home.myWallet')}
            </Link>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('home.demoCta')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 justify-center items-center">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center">
            <Link
              href="/register"
              className="bg-brand-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-600 w-full sm:w-auto"
            >
              {t('home.getStarted')}
            </Link>
            <Link
              href="/login"
              className="border border-gray-300 dark:border-surface-dark-3 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-surface-dark-2 w-full sm:w-auto"
            >
              {t('nav.login')}
            </Link>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('home.demoCta')}
          </p>
        </div>
      )}

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-left">
        <div className="p-6 bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">{t('home.demoTitle')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('home.demoDesc')}
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">{t('home.fairTitle')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('home.fairDesc')}
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">{t('home.instantTitle')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('home.instantDesc')}
          </p>
        </div>
      </div>

      {/* Scrolling ticker */}
      {tickerItems.length > 0 && (
        <div className="mt-16 overflow-hidden bg-brand-500/10 dark:bg-surface-dark-2 border-y border-brand-500/20 dark:border-surface-dark-3 py-2.5">
          <div className="ticker-scroll flex whitespace-nowrap gap-8 text-sm font-medium text-brand-600 dark:text-brand-400">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 shrink-0">
                <span className="text-accent-gold">&#9733;</span> {item}
              </span>
            ))}
          </div>
          <style jsx>{`
            .ticker-scroll {
              animation: ticker 25s linear infinite;
            }
            @keyframes ticker {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
