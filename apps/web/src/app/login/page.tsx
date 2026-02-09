'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AmbientConfetti from '@/components/AmbientConfetti';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/rooms');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <AmbientConfetti />
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">{t('login.title')}</h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dark-2 p-6 rounded-lg border border-gray-200 dark:border-surface-dark-3 space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-3 rounded">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-3 py-2 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-3 py-2 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 text-white py-2 rounded font-medium hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? t('login.loading') : t('login.submit')}
        </button>

        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          {t('login.noAccount')}{' '}
          <Link href="/register" className="text-brand-500 hover:underline">{t('login.signupLink')}</Link>
        </p>
      </form>
    </div>
  );
}
