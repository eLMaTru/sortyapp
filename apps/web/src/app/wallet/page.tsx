'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const { mode, isDemoMode } = useMode();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'transactions' | 'withdrawals'>('transactions');
  const [copied, setCopied] = useState(false);

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/register?ref=${user?.referralCode || ''}`
    : '';

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: do nothing */ }
  };

  useEffect(() => {
    api.wallet.transactions().then(setTransactions).catch(console.error);
    api.wallet.withdrawals().then(setWithdrawals).catch(console.error);
  }, []);

  if (!user) return <p className="dark:text-gray-400">{t('dash.pleaseLogin')}</p>;

  const balance = isDemoMode ? user.demoBalance : user.realBalance;
  const filteredTx = transactions.filter((tx) => tx.walletMode === mode);

  const isValidEvmAddress = (addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr);
  const addressTouched = walletAddress.length > 0;
  const addressValid = isValidEvmAddress(walletAddress);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double-submit
    setError('');
    setSuccess('');

    if (!addressValid) {
      setError(t('wallet.invalidAddress'));
      return;
    }

    setLoading(true);
    const credits = Math.round(parseFloat(withdrawAmount) * 100);
    try {
      const w = await api.wallet.withdraw({ amountCredits: credits, walletAddress });
      setSuccess(`Withdrawal requested: ${w.netUSDC} USDC (fee: ${w.feeUSDC} USDC)`);
      setWithdrawAmount('');
      // Save wallet address to profile if new/changed
      if (walletAddress !== user.walletAddress) {
        await api.auth.updateWalletAddress(walletAddress);
      }
      await refreshUser();
      const [updatedW, updatedTx] = await Promise.all([
        api.wallet.withdrawals(),
        api.wallet.transactions(),
      ]);
      setWithdrawals(updatedW);
      setTransactions(updatedTx);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (withdrawalId: string) => {
    if (cancellingId) return; // Prevent double-click
    setCancellingId(withdrawalId);
    setError('');
    setSuccess('');
    try {
      await api.wallet.cancelWithdrawal(withdrawalId);
      setSuccess(t('wallet.cancelled'));
      await refreshUser();
      const [updatedW, updatedTx] = await Promise.all([
        api.wallet.withdrawals(),
        api.wallet.transactions(),
      ]);
      setWithdrawals(updatedW);
      setTransactions(updatedTx);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('wallet.title')}</h1>

      {/* Balance */}
      <div className={`p-6 rounded-lg border mb-6 ${isDemoMode ? 'bg-purple-50 dark:bg-demo/10 border-purple-200 dark:border-demo/30' : 'bg-green-50 dark:bg-real/10 border-green-200 dark:border-real/30'}`}>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          {isDemoMode ? t('dash.demoBalance') : t('dash.realBalance')}
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{balance.toLocaleString()} SC</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">&asymp; ${(balance / 100).toFixed(2)} USDC</div>
      </div>

      {/* Withdrawal Form (Real mode only) */}
      {!isDemoMode && (
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4 mb-6">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('wallet.withdraw')}</h3>
          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-2 rounded mb-3">{error}</div>}
          {success && <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm p-2 rounded mb-3">{success}</div>}

          <form onSubmit={handleWithdraw} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('wallet.amount')}</label>
              <input
                type="number"
                min="10"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-3 py-2 text-sm dark:text-white"
                placeholder={t('wallet.minAmount')}
              />
              {withdrawAmount && (
                <p className="text-xs text-gray-400 mt-1">
                  {t('wallet.fee')} (1%): ${(parseFloat(withdrawAmount) * 0.01).toFixed(2)} &middot;
                  {t('wallet.net')}: ${(parseFloat(withdrawAmount) * 0.99).toFixed(2)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('wallet.walletAddress')}</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value.trim())}
                required
                className={`w-full border rounded px-3 py-2 text-sm font-mono dark:text-white focus:outline-none focus:ring-2 ${
                  !addressTouched
                    ? 'border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark focus:ring-brand-500'
                    : addressValid
                      ? 'border-green-400 dark:border-green-600 dark:bg-surface-dark focus:ring-green-500'
                      : 'border-red-400 dark:border-red-600 dark:bg-surface-dark focus:ring-red-500'
                }`}
                placeholder="0x..."
              />
              {addressTouched && !addressValid && (
                <p className="text-xs text-red-500 mt-1">{t('wallet.invalidAddress')}</p>
              )}
              {addressTouched && addressValid && (
                <p className="text-xs text-green-500 mt-1">
                  {t('wallet.validAddress')}
                  {walletAddress === user.walletAddress && ` · ${t('wallet.savedAddress')}`}
                </p>
              )}
              {!addressTouched && (
                <p className="text-xs text-gray-400 mt-1">{t('wallet.walletHint')}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || (addressTouched && !addressValid)}
              className="bg-brand-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? t('wallet.processing') : t('wallet.submitWithdraw')}
            </button>
          </form>
        </div>
      )}

      {isDemoMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 text-sm text-yellow-800 dark:text-yellow-300">
          {t('wallet.demoWarning')}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-surface-dark-3 mb-4">
        <button
          onClick={() => setTab('transactions')}
          className={`pb-2 text-sm font-medium ${tab === 'transactions' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {t('wallet.transactions')}
        </button>
        <button
          onClick={() => setTab('withdrawals')}
          className={`pb-2 text-sm font-medium ${tab === 'withdrawals' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {t('wallet.withdrawals')}
        </button>
      </div>

      {tab === 'transactions' && (
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
          {filteredTx.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{t('wallet.noTx')}</p>
          ) : (
            filteredTx.map((tx) => (
              <div key={tx.transactionId} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-900 dark:text-white">{tx.description}</div>
                  <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</div>
                </div>
                <div className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} SC
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
          {withdrawals.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{t('wallet.noWithdrawals')}</p>
          ) : (
            withdrawals.map((w) => (
              <div key={w.withdrawalId} className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">${w.netUSDC} USDC</div>
                  <div className="flex items-center gap-2">
                    {w.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancel(w.withdrawalId)}
                        disabled={cancellingId === w.withdrawalId}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium disabled:opacity-50"
                      >
                        {cancellingId === w.withdrawalId ? t('wallet.cancelling') : t('wallet.cancel')}
                      </button>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      w.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                      w.status === 'SENT' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      w.status === 'CANCELLED' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                      'bg-gray-100 dark:bg-surface-dark-3 text-gray-800 dark:text-gray-300'
                    }`}>
                      {w.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(w.createdAt).toLocaleString()}
                  {w.txHash && <span className="ml-2">TX: {w.txHash.slice(0, 12)}...</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Referral section */}
      <div className="mt-6 bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4">
        <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">{t('wallet.referralTitle')}</h3>
        <div className="text-lg font-mono font-bold text-brand-500 mb-2">{user.referralCode}</div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 text-xs font-mono bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-dark-3 rounded px-3 py-2 text-gray-600 dark:text-gray-300 truncate"
          />
          <button
            onClick={copyReferralLink}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
          >
            {copied ? t('wallet.copied') : t('wallet.copyLink')}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {t('wallet.referralHint')}
        </p>
      </div>
    </div>
  );
}
