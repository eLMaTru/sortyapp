'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  const { t } = useLanguage();
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-dark-2 rounded-lg max-w-md w-full p-6 border border-gray-200 dark:border-surface-dark-3">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-surface-dark-3 rounded hover:bg-gray-50 dark:hover:bg-surface-dark-3"
          >
            {t('confirm.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-brand-500 rounded hover:bg-brand-600"
          >
            {confirmLabel || t('confirm.yes')}
          </button>
        </div>
      </div>
    </div>
  );
}
