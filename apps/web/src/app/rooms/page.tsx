'use client';

import { useEffect, useState } from 'react';
import { useMode } from '@/contexts/ModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import RoomCard from '@/components/RoomCard';

export default function RoomsPage() {
  const { mode, isDemoMode } = useMode();
  const { t } = useLanguage();
  const [draws, setDraws] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('OPEN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.draws
      .list(mode, filter || undefined)
      .then(setDraws)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mode, filter]);

  const statuses = ['OPEN', 'COUNTDOWN', 'RUNNING', 'COMPLETED', ''];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          {isDemoMode ? t('rooms.demo') : t('rooms.real')}
        </h1>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
                filter === s
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white dark:bg-surface-dark-2 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-surface-dark-3 hover:bg-gray-50 dark:hover:bg-surface-dark-3'
              }`}
            >
              {s || t('rooms.all')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">{t('rooms.loading')}</p>
      ) : draws.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('rooms.none')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {draws.map((draw) => (
            <RoomCard key={draw.drawId} draw={draw} />
          ))}
        </div>
      )}
    </div>
  );
}
