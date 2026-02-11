'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

type WithdrawMethod = 'POLYGON' | 'BINANCE' | 'PAYPAL' | 'BANK_POPULAR' | 'BANK_BHD';

const WITHDRAW_METHODS: { method: WithdrawMethod; label: string; icon: string }[] = [
  { method: 'BINANCE', label: 'Binance Pay', icon: '🟡' },
  { method: 'PAYPAL', label: 'PayPal', icon: '🔵' },
  { method: 'BANK_POPULAR', label: 'Banco Popular', icon: '🏦' },
  { method: 'BANK_BHD', label: 'Banco BHD', icon: '🏦' },
  { method: 'POLYGON', label: 'Polygon (USDC)', icon: '🟣' },
];

const METHOD_LABELS: Record<string, string> = {
  POLYGON: 'Polygon (USDC)',
  BINANCE: 'Binance Pay',
  PAYPAL: 'PayPal',
  BANK_POPULAR: 'Banco Popular',
  BANK_BHD: 'Banco BHD',
};

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const { mode, isDemoMode } = useMode();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [enabledWithdrawMethods, setEnabledWithdrawMethods] = useState<string[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod | null>(null);

  // Method-specific fields
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || '');
  const [binancePayId, setBinancePayId] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

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
    api.wallet.depositMethods().then((data) => {
      if (data.withdrawMethods) setEnabledWithdrawMethods(data.withdrawMethods);
    }).catch(console.error);
  }, []);

  // Pre-fill fields when method changes from savedPaymentDetails
  useEffect(() => {
    if (!withdrawMethod || !user) return;
    const saved = user.savedPaymentDetails?.[withdrawMethod];
    if (withdrawMethod === 'POLYGON') {
      setWalletAddress(user.walletAddress || '');
    } else if (saved) {
      if (withdrawMethod === 'BINANCE') setBinancePayId(saved.binancePayId || '');
      if (withdrawMethod === 'PAYPAL') setPaypalEmail(saved.paypalEmail || '');
      if (withdrawMethod === 'BANK_POPULAR' || withdrawMethod === 'BANK_BHD') {
        setAccountNumber(saved.accountNumber || '');
        setAccountHolder(saved.accountHolder || '');
      }
    } else {
      // Clear fields if no saved data for this method
      if (withdrawMethod === 'BINANCE') setBinancePayId('');
      if (withdrawMethod === 'PAYPAL') setPaypalEmail('');
      if (withdrawMethod === 'BANK_POPULAR' || withdrawMethod === 'BANK_BHD') {
        setAccountNumber('');
        setAccountHolder('');
      }
    }
  }, [withdrawMethod, user]);

  if (!user) return <p className="dark:text-gray-400">{t('dash.pleaseLogin')}</p>;

  const balance = isDemoMode ? user.demoBalance : user.realBalance;
  const filteredTx = transactions.filter((tx) => tx.walletMode === mode);

  const isValidEvmAddress = (addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr);

  // Validate current method fields
  const isMethodValid = (): boolean => {
    if (!withdrawMethod) return false;
    switch (withdrawMethod) {
      case 'POLYGON': return isValidEvmAddress(walletAddress);
      case 'BINANCE': return binancePayId.trim().length > 0;
      case 'PAYPAL': return paypalEmail.trim().length > 0;
      case 'BANK_POPULAR':
      case 'BANK_BHD': return accountNumber.trim().length > 0 && accountHolder.trim().length > 0;
      default: return false;
    }
  };

  // Check amount validity
  const amountUSDC = parseFloat(withdrawAmount) || 0;
  const amountCredits = Math.round(amountUSDC * 100);
  const isAmountTooLow = amountUSDC > 0 && amountUSDC < 10;
  const isBalanceInsufficient = amountCredits > 0 && amountCredits > balance;
  const canSubmit = withdrawMethod && isMethodValid() && amountUSDC >= 10 && !isBalanceInsufficient && !loading;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !withdrawMethod) return;
    setError('');
    setSuccess('');

    // Frontend validations
    if (amountUSDC < 10) {
      setError(t('withdraw.minAmountError'));
      return;
    }
    if (amountCredits > balance) {
      setError(t('withdraw.insufficientBalance').replace('${needed}', amountCredits.toLocaleString()).replace('${balance}', balance.toLocaleString()));
      return;
    }
    if (!isMethodValid()) {
      setError(t('withdraw.fillRequired'));
      return;
    }

    setLoading(true);
    try {
      const payload: any = { method: withdrawMethod, amountCredits };
      if (withdrawMethod === 'POLYGON') payload.walletAddress = walletAddress;
      if (withdrawMethod === 'BINANCE') payload.binancePayId = binancePayId;
      if (withdrawMethod === 'PAYPAL') payload.paypalEmail = paypalEmail;
      if (withdrawMethod === 'BANK_POPULAR' || withdrawMethod === 'BANK_BHD') {
        payload.accountNumber = accountNumber;
        payload.accountHolder = accountHolder;
      }

      const w = await api.wallet.withdraw(payload);
      setSuccess(`${t('withdraw.success')}: $${w.netUSDC} USDC (${t('wallet.fee')}: $${w.feeUSDC})`);
      setWithdrawAmount('');

      // Save payment details to profile for pre-fill
      try {
        if (withdrawMethod === 'POLYGON' && walletAddress !== user.walletAddress) {
          await api.auth.updateWalletAddress(walletAddress);
        } else if (withdrawMethod === 'BINANCE') {
          await api.auth.savePaymentDetails('BINANCE', { binancePayId });
        } else if (withdrawMethod === 'PAYPAL') {
          await api.auth.savePaymentDetails('PAYPAL', { paypalEmail });
        } else if (withdrawMethod === 'BANK_POPULAR' || withdrawMethod === 'BANK_BHD') {
          await api.auth.savePaymentDetails(withdrawMethod, { accountNumber, accountHolder });
        }
      } catch { /* silent — non-critical */ }

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
    if (cancellingId) return;
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

  const getWithdrawalMethodLabel = (w: any): string => {
    if (w.method) return METHOD_LABELS[w.method] || w.method;
    if (w.walletAddress) return 'Polygon (USDC)';
    return 'N/A';
  };

  const getWithdrawalDetails = (w: any): string => {
    if (w.method === 'BINANCE' && w.paymentDetails?.binancePayId) return `Pay ID: ${w.paymentDetails.binancePayId}`;
    if (w.method === 'PAYPAL' && w.paymentDetails?.paypalEmail) return w.paymentDetails.paypalEmail;
    if ((w.method === 'BANK_POPULAR' || w.method === 'BANK_BHD') && w.paymentDetails?.accountNumber) {
      return `${w.paymentDetails.accountHolder} - ${w.paymentDetails.accountNumber}`;
    }
    if (w.walletAddress) return `${w.walletAddress.slice(0, 10)}...${w.walletAddress.slice(-6)}`;
    return '';
  };

  const hasSavedDetails = (method: WithdrawMethod): boolean => {
    if (method === 'POLYGON') return !!user.walletAddress;
    return !!user.savedPaymentDetails?.[method];
  };

  const inputCls = 'w-full border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-3 py-2 text-sm dark:text-white';

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
        {!isDemoMode && (
          <Link
            href="/deposit"
            className="inline-block mt-3 bg-brand-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-600"
          >
            {t('deposit.title')}
          </Link>
        )}
      </div>

      {/* Withdrawal Form (Real mode only) */}
      {!isDemoMode && (
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4 mb-6">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('wallet.withdraw')}</h3>
          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-2 rounded mb-3">{error}</div>}
          {success && <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm p-2 rounded mb-3">{success}</div>}

          {/* Method selector */}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">{t('withdraw.selectMethod')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WITHDRAW_METHODS.filter((m) => enabledWithdrawMethods.length === 0 || enabledWithdrawMethods.includes(m.method)).map((m) => (
                <button
                  key={m.method}
                  type="button"
                  onClick={() => { setWithdrawMethod(m.method); setError(''); setSuccess(''); }}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all relative ${
                    withdrawMethod === m.method
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500'
                      : 'border-gray-200 dark:border-surface-dark-3 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="mr-1.5">{m.icon}</span>
                  {m.label}
                  {hasSavedDetails(m.method) && (
                    <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Form shown after method selection */}
          {withdrawMethod && (
            <form onSubmit={handleWithdraw} className="space-y-3">
              {/* Amount */}
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('wallet.amount')}</label>
                <input
                  type="number"
                  min="10"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  className={`${inputCls} ${isBalanceInsufficient ? 'border-red-400 dark:border-red-500' : ''}`}
                  placeholder={t('wallet.minAmount')}
                />
                {isAmountTooLow && (
                  <p className="text-xs text-red-500 mt-1">{t('withdraw.minAmountError')}</p>
                )}
                {isBalanceInsufficient && (
                  <p className="text-xs text-red-500 mt-1">
                    {t('withdraw.insufficientBalance').replace('${needed}', amountCredits.toLocaleString()).replace('${balance}', balance.toLocaleString())}
                  </p>
                )}
                {withdrawAmount && !isAmountTooLow && !isBalanceInsufficient && (
                  <p className="text-xs text-gray-400 mt-1">
                    {t('wallet.fee')} (1%): ${(amountUSDC * 0.01).toFixed(2)} &middot;
                    {t('wallet.net')}: ${(amountUSDC * 0.99).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Method-specific fields */}
              {withdrawMethod === 'POLYGON' && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('wallet.walletAddress')}</label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value.trim())}
                    required
                    className={`${inputCls} font-mono`}
                    placeholder="0x..."
                  />
                  {walletAddress && !isValidEvmAddress(walletAddress) && (
                    <p className="text-xs text-red-500 mt-1">{t('wallet.invalidAddress')}</p>
                  )}
                  {walletAddress && isValidEvmAddress(walletAddress) && (
                    <p className="text-xs text-green-500 mt-1">
                      {t('wallet.validAddress')}
                      {walletAddress === user.walletAddress && ` · ${t('wallet.savedAddress')}`}
                    </p>
                  )}
                  {!walletAddress && (
                    <p className="text-xs text-gray-400 mt-1">{t('wallet.walletHint')}</p>
                  )}
                </div>
              )}

              {withdrawMethod === 'BINANCE' && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('withdraw.binancePayId')}
                    {user.savedPaymentDetails?.BINANCE && (
                      <span className="ml-2 text-green-500 text-xs">· {t('withdraw.savedDetails')}</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={binancePayId}
                    onChange={(e) => setBinancePayId(e.target.value.trim())}
                    required
                    className={inputCls}
                    placeholder={t('withdraw.binancePayIdHint')}
                  />
                </div>
              )}

              {withdrawMethod === 'PAYPAL' && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('withdraw.paypalEmail')}
                    {user.savedPaymentDetails?.PAYPAL && (
                      <span className="ml-2 text-green-500 text-xs">· {t('withdraw.savedDetails')}</span>
                    )}
                  </label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value.trim())}
                    required
                    className={inputCls}
                    placeholder={t('withdraw.paypalEmailHint')}
                  />
                </div>
              )}

              {(withdrawMethod === 'BANK_POPULAR' || withdrawMethod === 'BANK_BHD') && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('withdraw.accountHolder')}
                      {user.savedPaymentDetails?.[withdrawMethod] && (
                        <span className="ml-2 text-green-500 text-xs">· {t('withdraw.savedDetails')}</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      required
                      className={inputCls}
                      placeholder={t('withdraw.accountHolderHint')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('withdraw.accountNumber')}</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.trim())}
                      required
                      className={inputCls}
                      placeholder={t('withdraw.accountNumberHint')}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-brand-500 text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                {loading ? t('wallet.processing') : t('wallet.submitWithdraw')}
              </button>
            </form>
          )}
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
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3 max-h-[560px] overflow-y-auto">
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
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3 max-h-[560px] overflow-y-auto">
          {withdrawals.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{t('wallet.noWithdrawals')}</p>
          ) : (
            withdrawals.map((w) => (
              <div key={w.withdrawalId} className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">${w.netUSDC} USDC</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getWithdrawalMethodLabel(w)}
                      {getWithdrawalDetails(w) && ` · ${getWithdrawalDetails(w)}`}
                    </div>
                  </div>
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
