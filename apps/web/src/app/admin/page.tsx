'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

export default function AdminPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<'users' | 'withdrawals' | 'templates' | 'draws'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [depositUserId, setDepositUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [approveTxHash, setApproveTxHash] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [u, w, tpl, d] = await Promise.all([
        api.admin.users(),
        api.admin.pendingWithdrawals(),
        api.admin.templates(),
        api.admin.draws('REAL'),
      ]);
      setUsers(u);
      setWithdrawals(w);
      setTemplates(tpl);
      setDraws(d);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return <p className="text-red-500">{t('admin.accessDenied')}</p>;
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const credits = Math.round(parseFloat(depositAmount) * 100);
      await api.admin.simulateDeposit(depositUserId, credits);
      setMsg(`Deposited ${depositAmount} USDC to user`);
      setDepositAmount('');
      await loadData();
    } catch (e: any) { setErr(e.message); }
  };

  const handleApprove = async (withdrawalId: string) => {
    if (!approveTxHash.trim()) { setErr('Enter a transaction hash'); return; }
    setMsg(''); setErr('');
    try {
      await api.admin.approveWithdrawal(withdrawalId, approveTxHash);
      setMsg('Withdrawal approved');
      setApproveTxHash('');
      await loadData();
    } catch (e: any) { setErr(e.message); }
  };

  const handleEnsureDraws = async () => {
    try {
      await api.admin.ensureOpenDraws();
      setMsg('Open draws ensured for all templates');
      await loadData();
    } catch (e: any) { setErr(e.message); }
  };

  const tabKeys = ['users', 'withdrawals', 'templates', 'draws'] as const;
  const tabLabels: Record<string, string> = {
    users: t('admin.users'),
    withdrawals: t('admin.withdrawals'),
    templates: t('admin.templates'),
    draws: t('admin.draws'),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('admin.title')}</h1>

      {msg && <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm p-3 rounded mb-4">{msg}</div>}
      {err && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-3 rounded mb-4">{err}</div>}

      <div className="flex gap-4 border-b border-gray-200 dark:border-surface-dark-3 mb-6">
        {tabKeys.map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={`pb-2 text-sm font-medium ${
              tab === tk ? 'border-b-2 border-brand-500 text-brand-500' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {tabLabels[tk]}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div>
          <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4 mb-6">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('admin.simulateDeposit')}</h3>
            <form onSubmit={handleDeposit} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin.userId')}</label>
                <select
                  value={depositUserId}
                  onChange={(e) => setDepositUserId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-2 py-1.5 text-sm dark:text-white"
                >
                  <option value="">{t('admin.selectUser')}</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('wallet.amount')}</label>
                <input
                  type="number"
                  min="10"
                  step="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-2 py-1.5 text-sm w-28 dark:text-white"
                  placeholder="e.g. 100"
                />
              </div>
              <button type="submit" className="bg-success text-white px-4 py-1.5 rounded text-sm hover:bg-success-dark">
                {t('admin.deposit')}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
            {users.map((u) => (
              <div key={u.userId} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {u.username} <span className="text-gray-400">({u.email})</span>
                  </div>
                  <div className="text-xs text-gray-400">{u.role} &middot; Ref: {u.referralCode}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-demo">Demo: ${(u.demoBalance / 100).toFixed(2)}</div>
                  <div className="text-real">Real: ${(u.realBalance / 100).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawals tab */}
      {tab === 'withdrawals' && (
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
          {withdrawals.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{t('admin.noPending')}</p>
          ) : (
            withdrawals.map((w) => (
              <div key={w.withdrawalId} className="px-4 py-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ${w.netUSDC} USDC to {w.walletAddress.slice(0, 10)}...
                    </div>
                    <div className="text-xs text-gray-400">
                      User: {w.userId.slice(0, 8)} &middot; Fee: ${w.feeUSDC}
                    </div>
                  </div>
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                    {w.status}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={t('admin.enterTxHash')}
                    value={approveTxHash}
                    onChange={(e) => setApproveTxHash(e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-2 py-1 text-xs font-mono dark:text-white"
                  />
                  <button
                    onClick={() => handleApprove(w.withdrawalId)}
                    className="bg-brand-500 text-white px-3 py-1 rounded text-xs hover:bg-brand-600"
                  >
                    {t('admin.approve')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
          {templates.map((tpl) => (
            <div key={tpl.templateId} className="px-4 py-3 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {tpl.slots} {t('rooms.slots')} &middot; ${tpl.entryDollars} {t('rooms.entry')}
                </div>
                <div className="text-xs text-gray-400">
                  {t('room.fee')}: {tpl.feePercent}% &middot; {t('admin.requiresDeposit')}: {tpl.requiresDeposit ? t('common.yes') : t('common.no')}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                tpl.enabled
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {tpl.enabled ? t('admin.enabled') : t('admin.disabled')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Draws tab */}
      {tab === 'draws' && (
        <div>
          <button
            onClick={handleEnsureDraws}
            className="mb-4 bg-brand-500 text-white px-4 py-2 rounded text-sm hover:bg-brand-600"
          >
            {t('admin.ensureDraws')}
          </button>
          <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
            {draws.map((d) => (
              <div key={d.drawId} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    #{d.drawId.slice(0, 8)} &middot; {d.totalSlots} {t('rooms.slots')} &middot; ${d.entryDollars}
                  </div>
                  <div className="text-xs text-gray-400">
                    {d.filledSlots}/{d.totalSlots} {t('admin.filled')} &middot; {d.mode}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  d.status === 'OPEN' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                  d.status === 'COMPLETED' ? 'bg-gray-100 dark:bg-surface-dark-3 text-gray-800 dark:text-gray-300' :
                  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
