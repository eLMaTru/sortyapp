'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

export default function RankingsPage() {
  const { t } = useLanguage();
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<'REAL' | 'DEMO'>('REAL');

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        // Always show REAL rankings first
        let data = await api.draws.rankings('REAL');
        let mode: 'REAL' | 'DEMO' = 'REAL';
        if (data.length === 0) {
          // Fallback to DEMO if no real data yet
          data = await api.draws.rankings('DEMO');
          mode = 'DEMO';
        }
        setRankings(data);
        setDisplayMode(mode);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('rankings.title')}</h1>

      {displayMode === 'DEMO' && rankings.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t('rankings.demoFallback')}
        </p>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
      ) : rankings.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('rankings.noData')}</p>
      ) : (
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 dark:bg-surface-dark-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <div className="col-span-1">{t('rankings.rank')}</div>
            <div className="col-span-3">{t('rankings.player')}</div>
            <div className="col-span-2 text-center">{t('rankings.wins')}</div>
            <div className="col-span-2 text-center">{t('rankings.plays')}</div>
            <div className="col-span-2 text-center">{t('rankings.winRate')}</div>
            <div className="col-span-2 text-right">{t('rankings.totalWon')}</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-200 dark:divide-surface-dark-3">
            {rankings.map((r, i) => (
              <div key={r.userId} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                i < 3 ? 'bg-accent-gold/5' : ''
              }`}>
                <div className="col-span-1">
                  {i === 0 ? (
                    <span className="text-lg">🥇</span>
                  ) : i === 1 ? (
                    <span className="text-lg">🥈</span>
                  ) : i === 2 ? (
                    <span className="text-lg">🥉</span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{i + 1}</span>
                  )}
                </div>
                <div className="col-span-3 text-sm font-medium text-gray-900 dark:text-white truncate">
                  {r.username}
                </div>
                <div className="col-span-2 text-center text-sm font-semibold text-brand-500">{r.wins}</div>
                <div className="col-span-2 text-center text-sm text-gray-600 dark:text-gray-400">{r.participations}</div>
                <div className="col-span-2 text-center text-sm text-gray-600 dark:text-gray-400">{r.winRate}%</div>
                <div className="col-span-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                  {r.totalWinnings.toLocaleString()} SC
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
