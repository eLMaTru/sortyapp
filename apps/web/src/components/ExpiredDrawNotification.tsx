'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

interface ExpiredNotification {
  drawId: string;
  mode: string;
  entryCredits: number;
}

export default function ExpiredDrawNotification() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<ExpiredNotification[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.auth.notifications()
      .then((items) => {
        if (items.length > 0) {
          setNotifications(items);
          setShow(true);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleDismiss = async () => {
    setShow(false);
    try {
      await api.auth.dismissNotifications();
    } catch { /* ignore */ }
  };

  if (!show || notifications.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-xl max-w-sm w-full p-6">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
          {t('expired.title')}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
          {notifications.length === 1
            ? t('expired.messageSingle')
            : t('expired.messageMultiple').replace('${count}', String(notifications.length))
          }
        </p>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-700 dark:text-green-300 text-center font-medium">
            {t('expired.refunded')}
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full bg-brand-500 text-white py-2.5 rounded-lg font-medium hover:bg-brand-600 transition-colors text-sm"
        >
          {t('expired.ok')}
        </button>
      </div>
    </div>
  );
}
