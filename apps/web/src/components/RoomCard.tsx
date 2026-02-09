'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface RoomCardProps {
  draw: {
    drawId: string;
    totalSlots: number;
    entryDollars: number;
    filledSlots: number;
    status: string;
    mode: string;
    winnerUsername?: string;
  };
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  FULL: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  COUNTDOWN: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  RUNNING: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  COMPLETED: 'bg-gray-100 dark:bg-surface-dark-3 text-gray-800 dark:text-gray-300',
};

export default function RoomCard({ draw }: RoomCardProps) {
  const { t } = useLanguage();
  const spotsLeft = draw.totalSlots - draw.filledSlots;
  const progress = (draw.filledSlots / draw.totalSlots) * 100;

  return (
    <Link
      href={`/rooms/${draw.drawId}`}
      className="block bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4 hover:shadow-md dark:hover:shadow-brand-500/10 transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">${draw.entryDollars}</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">{t('rooms.entry')}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[draw.status] || ''}`}>
          {draw.status}
        </span>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {draw.totalSlots} {t('rooms.slots')} &middot; Pool: ${draw.entryDollars * draw.totalSlots * 0.9}
      </div>

      {draw.status === 'OPEN' && (
        <>
          <div className="w-full bg-gray-200 dark:bg-surface-dark-3 rounded-full h-2 mb-1">
            <div
              className="bg-brand-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {spotsLeft} {t('rooms.spotsLeft')}
          </div>
        </>
      )}

      {draw.status === 'COMPLETED' && draw.winnerUsername && (
        <div className="text-sm mt-1 text-gray-700 dark:text-gray-300">
          {t('rooms.winner')}: <span className="font-medium">{draw.winnerUsername}</span>
        </div>
      )}
    </Link>
  );
}
