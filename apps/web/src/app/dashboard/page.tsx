'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const { mode, isDemoMode } = useMode();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    api.wallet.transactions().then(setTransactions).catch(console.error);
  }, []);

  if (!user) return <p className="dark:text-gray-400">{t('dash.pleaseLogin')}</p>;

  const filteredTx = transactions.filter((tx) => tx.walletMode === mode).slice(0, 10);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('dash.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`p-6 rounded-lg border ${isDemoMode ? 'bg-purple-50 dark:bg-demo/10 border-purple-200 dark:border-demo/30' : 'bg-green-50 dark:bg-real/10 border-green-200 dark:border-real/30'}`}>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {isDemoMode ? t('dash.demoBalance') : t('dash.realBalance')}
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {(isDemoMode ? user.demoBalance : user.realBalance).toLocaleString()} SC
          </div>
        </div>

        <div className="p-6 rounded-lg border bg-white dark:bg-surface-dark-2 border-gray-200 dark:border-surface-dark-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('dash.referralCode')}</div>
          <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">{user.referralCode}</div>
          <p className="text-xs text-gray-400 mt-1">{t('dash.referralHint')}</p>
        </div>

        <div className="p-6 rounded-lg border bg-white dark:bg-surface-dark-2 border-gray-200 dark:border-surface-dark-3 flex items-center justify-center">
          <Link
            href="/rooms"
            className="bg-brand-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-600"
          >
            {t('dash.browseRooms')}
          </Link>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
        {t('dash.recentTx')} ({mode})
      </h2>
      {filteredTx.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dash.noTx')}</p>
      ) : (
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
          {filteredTx.map((tx) => (
            <div key={tx.transactionId} className="px-4 py-3 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{tx.description}</div>
                <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</div>
              </div>
              <div className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} SC
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
