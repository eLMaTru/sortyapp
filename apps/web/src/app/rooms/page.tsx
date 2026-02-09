'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import RoomCard from '@/components/RoomCard';

export default function RoomsPage() {
  return (
    <Suspense>
      <RoomsContent />
    </Suspense>
  );
}

function RoomsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { mode, isDemoMode } = useMode();
  const { t } = useLanguage();
  const [draws, setDraws] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('OPEN');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (searchParams.get('toast') === 'no-match') {
      setToast(t('rooms.noMatchToast'));
      window.history.replaceState({}, '', '/rooms');
      const timer = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, t]);

  useEffect(() => {
    setLoading(true);
    api.draws
      .list(mode, filter || undefined)
      .then(setDraws)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mode, filter]);

  // Filter visibility:
  // - OPEN: show all (user needs to see available rooms)
  // - COMPLETED: only show draws the user participated in (last 100)
  // - FULL/COUNTDOWN/RUNNING: only show if user is a participant
  const visibleDraws = draws
    .filter((draw) => {
      if (draw.status === 'OPEN') return true;
      // All non-OPEN statuses: only show if user participated
      return user && draw.participants?.includes(user.userId);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);

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

      {toast && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4 text-sm text-orange-700 dark:text-orange-300 text-center animate-fade-in">
          {toast}
        </div>
      )}

      {isDemoMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-sm text-blue-700 dark:text-blue-300 text-center">
          {t('rooms.demoBanner')}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">{t('rooms.loading')}</p>
      ) : visibleDraws.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('rooms.none')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleDraws.map((draw) => (
            <RoomCard key={draw.drawId} draw={draw} />
          ))}
        </div>
      )}
    </div>
  );
}
