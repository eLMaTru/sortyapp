'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">{t('home.title')}</h1>
      <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-xl mx-auto">
        {t('home.subtitle')}
      </p>

      {user ? (
        <div className="flex gap-4 justify-center">
          <Link
            href="/rooms"
            className="bg-brand-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-600"
          >
            {t('home.browse')}
          </Link>
          <Link
            href="/wallet"
            className="border border-gray-300 dark:border-surface-dark-3 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-surface-dark-2"
          >
            {t('home.myWallet')}
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-brand-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-600"
          >
            {t('home.getStarted')}
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 dark:border-surface-dark-3 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-surface-dark-2"
          >
            {t('nav.login')}
          </Link>
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
    </div>
  );
}
