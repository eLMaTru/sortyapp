'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { CREDITS_PER_USDC } from '@sortyapp/shared';

type DepositMethod = {
  method: string;
  label: string;
  instructions: string;
  fields: string[];
};

type Step = 'select' | 'form' | 'success';

export default function DepositPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdDeposit, setCreatedDeposit] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.wallet.depositMethods().then(setMethods).catch(console.error);
    api.wallet.depositRequests().then(setMyRequests).catch(console.error);
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <p className="text-gray-600 dark:text-gray-400">{t('deposit.loginRequired')}</p>
        <Link href="/login" className="text-brand-500 hover:underline mt-2 inline-block">{t('nav.login')}</Link>
      </div>
    );
  }

  const handleSelectMethod = (method: DepositMethod) => {
    setSelectedMethod(method);
    setStep('form');
    setError('');
    setAmount('');
    setReference('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 5 || amountNum > 100) {
      setError(`${t('deposit.min')} / ${t('deposit.max')}`);
      return;
    }

    setLoading(true);
    try {
      const deposit = await api.wallet.createDepositRequest({
        method: selectedMethod!.method,
        amountUSDC: amountNum,
        reference: reference || undefined,
      });
      setCreatedDeposit(deposit);
      setStep('success');
      // Refresh requests list
      const updated = await api.wallet.depositRequests();
      setMyRequests(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'APPROVED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'REJECTED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'EXPIRED': return 'bg-gray-100 dark:bg-surface-dark-3 text-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 dark:bg-surface-dark-3 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('deposit.title')}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('deposit.subtitle')}</p>

      {/* Step 1: Select Method */}
      {step === 'select' && (
        <>
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{t('deposit.selectMethod')}</h2>
          <div className="grid gap-3">
            {methods.map((m) => (
              <button
                key={m.method}
                onClick={() => handleSelectMethod(m)}
                className="text-left p-4 bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
              >
                <div className="font-semibold text-gray-900 dark:text-white">{m.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{m.instructions.slice(0, 80)}...</div>
              </button>
            ))}
          </div>

          {/* My Requests toggle */}
          <div className="mt-8">
            <button
              onClick={() => setShowRequests(!showRequests)}
              className="text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              {t('deposit.myRequests')} ({myRequests.length})
            </button>

            {showRequests && (
              <div className="mt-3 bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
                {myRequests.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{t('deposit.noRequests')}</p>
                ) : (
                  myRequests.map((d) => (
                    <div key={d.depositRequestId} className="px-4 py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">${d.amountUSDC} USD</span>
                          <span className="text-xs text-gray-400 ml-2">via {d.method}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(d.status)}`}>
                          {t(`deposit.status.${d.status}` as any)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {t('deposit.code')}: <span className="font-mono font-bold">{d.code}</span>
                        {' · '}{new Date(d.createdAt).toLocaleString()}
                      </div>
                      {d.adminNote && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('admin.adminNote')}: {d.adminNote}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Step 2: Amount + Instructions Form */}
      {step === 'form' && selectedMethod && (
        <>
          <button
            onClick={() => { setStep('select'); setError(''); }}
            className="text-sm text-brand-500 hover:text-brand-600 mb-4 inline-block"
          >
            &larr; {t('deposit.back')}
          </button>

          <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-5">
            <h2 className="font-semibold text-lg mb-1 text-gray-900 dark:text-white">{selectedMethod.label}</h2>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('deposit.instructions')}</div>
              <div className="text-sm text-blue-900 dark:text-blue-200">{selectedMethod.instructions}</div>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-2 rounded mb-3">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('deposit.amount')}</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-3 py-2 text-sm dark:text-white"
                  placeholder="5 - 100"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">{t('deposit.min')} / {t('deposit.max')}</span>
                  <span className="text-xs text-gray-400">{t('deposit.dailyLimit')}</span>
                </div>
                {amount && parseFloat(amount) >= 5 && (
                  <p className="text-sm text-brand-500 font-medium mt-2">
                    {t('deposit.creditsPreview')}: {(parseFloat(amount) * CREDITS_PER_USDC).toLocaleString()} SC
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('deposit.reference')}</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-3 py-2 text-sm dark:text-white"
                  placeholder={selectedMethod.fields[0] || ''}
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">{t('deposit.referenceHint')}</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                {loading ? t('deposit.submitting') : t('deposit.submit')}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Step 3: Success */}
      {step === 'success' && createdDeposit && (
        <div className="text-center">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
            <div className="text-green-700 dark:text-green-300 text-lg font-semibold mb-2">
              {t('deposit.success')}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              ${createdDeposit.amountUSDC} USD &rarr; {createdDeposit.amountCredits.toLocaleString()} SC
            </div>

            <div className="bg-white dark:bg-surface-dark-2 rounded p-4 inline-block">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('deposit.code')}</div>
              <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">{createdDeposit.code}</div>
              <p className="text-xs text-gray-400 mt-2 max-w-xs">{t('deposit.codeHint')}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setStep('select');
              setCreatedDeposit(null);
              setError('');
            }}
            className="bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-600"
          >
            {t('deposit.newRequest')}
          </button>
        </div>
      )}
    </div>
  );
}
