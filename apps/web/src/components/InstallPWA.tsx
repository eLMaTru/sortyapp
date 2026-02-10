'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already running as installed PWA (check both standard and iOS-specific)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    if (isStandalone) return;
    // Check if user previously dismissed
    if (localStorage.getItem('pwa-dismissed')) return;

    // iOS detection: includes iPadOS 13+ which reports as "Macintosh"
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios|edgios/i.test(navigator.userAgent);

    if (isIOS) {
      // Only Safari can install PWAs on iOS
      if (isSafari) setShowIOSHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSHint(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto bg-white dark:bg-surface-dark-2 rounded-lg shadow-lg border border-gray-200 dark:border-surface-dark-3 p-4">
      <div className="flex items-start gap-3">
        <img src="/logo-192.png" alt="SORTYAPP" className="h-10 w-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 dark:text-white">
            {t('pwa.title')}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {showIOSHint ? t('pwa.iosHint') : t('pwa.description')}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {deferredPrompt && (
        <button
          onClick={handleInstall}
          className="mt-3 w-full bg-brand-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-brand-600 transition-colors"
        >
          {t('pwa.install')}
        </button>
      )}
    </div>
  );
}
