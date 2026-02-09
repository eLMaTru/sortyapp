'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

export default function AdminPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<'metrics' | 'users' | 'withdrawals' | 'templates' | 'draws'>('metrics');
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [drawMode, setDrawMode] = useState<'DEMO' | 'REAL'>('REAL');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [depositUserId, setDepositUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [approveTxHash, setApproveTxHash] = useState('');

  // Create template form
  const [newSlots, setNewSlots] = useState('5');
  const [newEntry, setNewEntry] = useState('');
  const [newRequiresDeposit, setNewRequiresDeposit] = useState(false);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    loadData();
  }, [user]);

  // Reload draws when mode changes
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    api.admin.draws(drawMode).then(setDraws).catch((e: any) => setErr(e.message));
  }, [drawMode, user]);

  const loadData = async () => {
    try {
      const [u, w, tpl, d, m] = await Promise.all([
        api.admin.users(),
        api.admin.pendingWithdrawals(),
        api.admin.templates(),
        api.admin.draws(drawMode),
        api.admin.metrics(),
      ]);
      setUsers(u);
      setWithdrawals(w);
      setTemplates(tpl.sort((a: any, b: any) => (a.slots - b.slots) || ((a.entryCredits || a.entryDollars * 100) - (b.entryCredits || b.entryDollars * 100))));
      setDraws(d);
      setMetrics(m);
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

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const entryDollars = parseFloat(newEntry);
      if (!entryDollars || entryDollars <= 0) { setErr('Enter a valid entry amount'); return; }
      await api.admin.createTemplate({
        slots: parseInt(newSlots),
        entryDollars,
        requiresDeposit: newRequiresDeposit,
        enabled: true,
      });
      setMsg(t('admin.templateCreated'));
      setNewEntry('');
      setNewRequiresDeposit(false);
      await loadData();
    } catch (e: any) { setErr(e.message); }
  };

  const handleToggleTemplate = async (tpl: any) => {
    setMsg(''); setErr('');
    try {
      await api.admin.updateTemplate({ templateId: tpl.templateId, enabled: !tpl.enabled });
      setMsg(t('admin.templateUpdated'));
      await loadData();
    } catch (e: any) { setErr(e.message); }
  };

  const handleForceFinalize = async (drawId: string) => {
    setMsg(''); setErr('');
    try {
      await api.admin.forceFinalize(drawId);
      setMsg(t('admin.drawFinalized'));
      await loadData();
    } catch (e: any) { setErr(e.message); }
  };

  const tabKeys = ['metrics', 'users', 'withdrawals', 'templates', 'draws'] as const;
  const tabLabels: Record<string, string> = {
    metrics: t('admin.metrics'),
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

      <div className="flex gap-3 md:gap-4 border-b border-gray-200 dark:border-surface-dark-3 mb-6 overflow-x-auto">
        {tabKeys.map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={`pb-2 text-sm font-medium whitespace-nowrap ${
              tab === tk ? 'border-b-2 border-brand-500 text-brand-500' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {tabLabels[tk]}
          </button>
        ))}
      </div>

      {/* Metrics tab */}
      {tab === 'metrics' && metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label={t('admin.totalUsers')} value={metrics.totalUsers} />
          <MetricCard label={t('admin.drawsCompleted')} value={metrics.totalDrawsCompleted} />
          <MetricCard label={t('admin.drawsOpen')} value={metrics.totalDrawsOpen} />
          <MetricCard label={t('admin.totalSCSpent')} value={metrics.totalSCSpent.toLocaleString()} sub={`~$${(metrics.totalSCSpent / 100).toFixed(2)}`} />
          <MetricCard label={t('admin.totalFeeSC')} value={metrics.totalFeeSC.toLocaleString()} sub={`~$${(metrics.totalFeeSC / 100).toFixed(2)}`} color="text-brand-500" />
          <MetricCard label={t('admin.pendingWithdrawals')} value={metrics.totalWithdrawalsPending} color={metrics.totalWithdrawalsPending > 0 ? 'text-yellow-600' : undefined} />
          <MetricCard label={t('admin.sentWithdrawals')} value={metrics.totalWithdrawalsSent} />
          <MetricCard label={t('admin.recentDraws')} value={metrics.recentDraws} />
          <MetricCard label={t('admin.recentUsers')} value={metrics.recentUsers} />
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div>
          <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4 mb-6">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('admin.simulateDeposit')}</h3>
            <form onSubmit={handleDeposit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
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
              <div key={u.userId} className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {u.username} <span className="text-gray-400 text-xs">({u.email})</span>
                  </div>
                  <div className="text-xs text-gray-400">{u.role} &middot; Ref: {u.referralCode}</div>
                </div>
                <div className="flex gap-3 sm:block sm:text-right text-xs sm:text-sm">
                  <div className="text-demo">Demo: {u.demoBalance.toLocaleString()} SC</div>
                  <div className="text-real">Real: {u.realBalance.toLocaleString()} SC</div>
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
        <div>
          <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4 mb-6">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('admin.createTemplate')}</h3>
            <form onSubmit={handleCreateTemplate} className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin.slots')}</label>
                <select
                  value={newSlots}
                  onChange={(e) => setNewSlots(e.target.value)}
                  className="border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-2 py-1.5 text-sm w-20 dark:text-white"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin.entryAmount')}</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  className="border border-gray-300 dark:border-surface-dark-3 dark:bg-surface-dark rounded px-2 py-1.5 text-sm w-28 dark:text-white"
                  placeholder="e.g. 1.00"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRequiresDeposit}
                  onChange={(e) => setNewRequiresDeposit(e.target.checked)}
                  className="rounded"
                />
                {t('admin.requiresDeposit')}
              </label>
              <button type="submit" className="bg-brand-500 text-white px-4 py-1.5 rounded text-sm hover:bg-brand-600">
                {t('admin.create')}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
            {templates.map((tpl) => (
              <div key={tpl.templateId} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {tpl.slots} {t('rooms.slots')} &middot; {(tpl.entryCredits || tpl.entryDollars * 100).toLocaleString()} SC {t('rooms.entry')}
                  </div>
                  <div className="text-xs text-gray-400">
                    {t('room.fee')}: {tpl.feePercent}% &middot; {t('admin.requiresDeposit')}: {tpl.requiresDeposit ? t('common.yes') : t('common.no')}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleTemplate(tpl)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    tpl.enabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                  }`}
                >
                  {tpl.enabled ? t('admin.enabled') : t('admin.disabled')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draws tab */}
      {tab === 'draws' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={handleEnsureDraws}
              className="bg-brand-500 text-white px-4 py-2 rounded text-sm hover:bg-brand-600"
            >
              {t('admin.ensureDraws')}
            </button>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-surface-dark-3 w-fit">
              <button
                onClick={() => setDrawMode('DEMO')}
                className={`px-4 py-2 text-xs font-semibold transition-colors ${
                  drawMode === 'DEMO'
                    ? 'bg-demo text-white'
                    : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-dark-2'
                }`}
              >
                DEMO
              </button>
              <button
                onClick={() => setDrawMode('REAL')}
                className={`px-4 py-2 text-xs font-semibold transition-colors ${
                  drawMode === 'REAL'
                    ? 'bg-real text-white'
                    : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-dark-2'
                }`}
              >
                REAL
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 divide-y divide-gray-200 dark:divide-surface-dark-3">
            {draws.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{t('admin.noDraws')}</p>
            ) : (
              draws.map((d) => (
                <div key={d.drawId} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      #{d.drawId.slice(0, 8)} &middot; {d.totalSlots} {t('rooms.slots')} &middot; {(d.entryCredits || d.entryDollars * 100).toLocaleString()} SC
                    </div>
                    <div className="text-xs text-gray-400">
                      {d.filledSlots}/{d.totalSlots} {t('admin.filled')} &middot; {d.mode}
                      {d.winnerId && ` · Winner: ${d.winnerUsername || d.winnerId.slice(0, 8)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(d.status === 'COUNTDOWN' || d.status === 'RUNNING') && (
                      <button
                        onClick={() => handleForceFinalize(d.drawId)}
                        className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50"
                      >
                        {t('admin.forceFinalize')}
                      </button>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      d.status === 'OPEN' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      d.status === 'COMPLETED' ? 'bg-gray-100 dark:bg-surface-dark-3 text-gray-800 dark:text-gray-300' :
                      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color || 'text-gray-900 dark:text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
