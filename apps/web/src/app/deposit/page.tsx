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
  currency?: string;
  binancePayId?: string;
  binanceUser?: string;
  accountNumber?: string;
  accountType?: string;
  bankName?: string;
  paypalEmail?: string;
};

function generateDepositCode(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(2)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `DEP-${hex}`;
}

export default function DepositPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [dopRate, setDopRate] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(null);
  const [depositCode, setDepositCode] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.wallet.depositMethods().then((data) => {
      setMethods(data.methods);
      setDopRate(data.dopRate);
    }).catch(console.error);
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
    setDepositCode(generateDepositCode());
    setError('');
    setAmount('');
    setReference('');
    setSuccess(false);
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
      await api.wallet.createDepositRequest({
        method: selectedMethod!.method,
        amountUSDC: amountNum,
        reference: reference || undefined,
        code: depositCode,
      });
      setSuccess(true);
      const updated = await api.wallet.depositRequests();
      setMyRequests(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDOP = selectedMethod?.currency === 'DOP';
  const dopAmount = isDOP && amount && dopRate > 0
    ? (parseFloat(amount) * dopRate).toFixed(2)
    : null;

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

      {/* Method selection */}
      {!selectedMethod && (
        <>
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{t('deposit.selectMethod')}</h2>
          <div className="grid gap-3">
            {methods.map((m) => {
              if (m.currency === 'DOP' && dopRate <= 0) return null;
              return (
                <button
                  key={m.method}
                  onClick={() => handleSelectMethod(m)}
                  className="text-left p-4 bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
                >
                  <div className="font-semibold text-gray-900 dark:text-white">{m.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {m.currency === 'DOP'
                      ? `${t('deposit.dopRate')}: RD$${dopRate} / 1 USD`
                      : m.method === 'PAYPAL'
                        ? `PayPal: ${m.paypalEmail}`
                        : m.instructions.slice(0, 80) + '...'}
                  </div>
                </button>
              );
            })}
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

      {/* Single-page flow: payment info + code + form */}
      {selectedMethod && !success && (
        <>
          <button
            onClick={() => { setSelectedMethod(null); setError(''); }}
            className="text-sm text-brand-500 hover:text-brand-600 mb-4 inline-block"
          >
            &larr; {t('deposit.back')}
          </button>

          <h2 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">{selectedMethod.label}</h2>

          {/* Deposit code - prominent */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('deposit.code')}</div>
            <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">{depositCode}</div>
          </div>

          {/* Warning: include code in memo */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <div className="text-sm font-semibold text-red-700 dark:text-red-300">{t('deposit.memoWarning')}</div>
          </div>

          {/* Binance Pay - QR + Pay ID */}
          {selectedMethod.method === 'BINANCE' && (
            <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-5 mb-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <img
                  src="/binance-qr.jpg"
                  alt="Binance Pay QR"
                  className="w-40 h-40 rounded-lg border border-gray-200 dark:border-surface-dark-3"
                />
                <div className="text-center sm:text-left">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">{t('deposit.binanceScan')}</div>
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Binance Pay ID</div>
                    <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">{selectedMethod.binancePayId}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('deposit.binanceUser')}</div>
                    <div className="text-sm font-mono text-gray-700 dark:text-gray-300">{selectedMethod.binanceUser}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('deposit.binanceMemo')}</div>
                    <div className="text-lg font-mono font-bold text-brand-500">{depositCode}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PayPal - email + code */}
          {selectedMethod.method === 'PAYPAL' && (
            <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-5 mb-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('deposit.paypalEmail')}</span>
                  <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{selectedMethod.paypalEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('deposit.paypalMemo')}</span>
                  <span className="text-sm font-mono font-bold text-brand-500">{depositCode}</span>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 mt-4">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('deposit.instructions')}</div>
                <div className="text-sm text-blue-900 dark:text-blue-200">{selectedMethod.instructions}</div>
              </div>
            </div>
          )}

          {/* Bank accounts - account details */}
          {(selectedMethod.method === 'BANK_POPULAR' || selectedMethod.method === 'BANK_BHD') && (
            <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-5 mb-4">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">{t('deposit.bankDetails')}</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('deposit.bankName')}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedMethod.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('deposit.accountNumber')}</span>
                  <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{selectedMethod.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('deposit.accountType')}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{selectedMethod.accountType}</span>
                </div>
                {dopRate > 0 && (
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-surface-dark-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('deposit.dopRate')}</span>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">RD${dopRate} / 1 USD</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-surface-dark-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('deposit.bankMemo')}</span>
                  <span className="text-sm font-mono font-bold text-brand-500">{depositCode}</span>
                </div>
              </div>
            </div>
          )}

          {/* Form: amount + reference + submit */}
          <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-5">
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
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-brand-500 font-medium">
                      {t('deposit.creditsPreview')}: {(parseFloat(amount) * CREDITS_PER_USDC).toLocaleString()} SC
                    </p>
                    {isDOP && dopAmount && (
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {t('deposit.dopToSend')}: RD${parseFloat(dopAmount).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('deposit.reference')}</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-3 py-2 text-sm dark:text-white"
                  placeholder={selectedMethod.fields[0] || 'Transaction ID'}
                />
                <span className="text-xs text-gray-400">{t('deposit.referenceHint')}</span>
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

      {/* Success confirmation */}
      {selectedMethod && success && (
        <div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4 text-center">
            <div className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">{t('deposit.success')}</div>
            <div className="text-sm text-green-600 dark:text-green-400">{t('deposit.successHint')}</div>
          </div>

          <button
            onClick={() => {
              setSelectedMethod(null);
              setSuccess(false);
              setError('');
            }}
            className="w-full bg-brand-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-600"
          >
            {t('deposit.newRequest')}
          </button>
        </div>
      )}
    </div>
  );
}
