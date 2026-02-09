'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'users' | 'withdrawals' | 'templates' | 'draws'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Deposit form state
  const [depositUserId, setDepositUserId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  // Withdrawal approval
  const [approveTxHash, setApproveTxHash] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [u, w, t, d] = await Promise.all([
        api.admin.users(),
        api.admin.pendingWithdrawals(),
        api.admin.templates(),
        api.admin.draws('REAL'),
      ]);
      setUsers(u);
      setWithdrawals(w);
      setTemplates(t);
      setDraws(d);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return <p className="text-red-500">Access denied. Admin only.</p>;
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

  const tabs = ['users', 'withdrawals', 'templates', 'draws'] as const;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {msg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded mb-4">{msg}</div>}
      {err && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{err}</div>}

      <div className="flex gap-4 border-b mb-6">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize ${
              tab === t ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div>
          {/* Simulate Deposit */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h3 className="font-semibold mb-3">Simulate Deposit</h3>
            <form onSubmit={handleDeposit} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">User ID</label>
                <select
                  value={depositUserId}
                  onChange={(e) => setDepositUserId(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Select user</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount (USD)</label>
                <input
                  type="number"
                  min="10"
                  step="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm w-28"
                  placeholder="e.g. 100"
                />
              </div>
              <button type="submit" className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">
                Deposit
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg border divide-y">
            {users.map((u) => (
              <div key={u.userId} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">{u.username} <span className="text-gray-400">({u.email})</span></div>
                  <div className="text-xs text-gray-400">{u.role} &middot; Ref: {u.referralCode}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-purple-600">Demo: ${(u.demoBalance / 100).toFixed(2)}</div>
                  <div className="text-green-600">Real: ${(u.realBalance / 100).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawals tab */}
      {tab === 'withdrawals' && (
        <div className="bg-white rounded-lg border divide-y">
          {withdrawals.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No pending withdrawals.</p>
          ) : (
            withdrawals.map((w) => (
              <div key={w.withdrawalId} className="px-4 py-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium">
                      ${w.netUSDC} USDC to {w.walletAddress.slice(0, 10)}...
                    </div>
                    <div className="text-xs text-gray-400">
                      User: {w.userId.slice(0, 8)} &middot; Fee: ${w.feeUSDC}
                    </div>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    {w.status}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Enter tx hash"
                    value={approveTxHash}
                    onChange={(e) => setApproveTxHash(e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-xs font-mono"
                  />
                  <button
                    onClick={() => handleApprove(w.withdrawalId)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="bg-white rounded-lg border divide-y">
          {templates.map((t) => (
            <div key={t.templateId} className="px-4 py-3 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">
                  {t.slots} slots &middot; ${t.entryDollars} entry
                </div>
                <div className="text-xs text-gray-400">
                  Fee: {t.feePercent}% &middot; Requires deposit: {t.requiresDeposit ? 'Yes' : 'No'}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                t.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {t.enabled ? 'Enabled' : 'Disabled'}
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
            className="mb-4 bg-brand-600 text-white px-4 py-2 rounded text-sm hover:bg-brand-700"
          >
            Ensure Open Draws
          </button>
          <div className="bg-white rounded-lg border divide-y">
            {draws.map((d) => (
              <div key={d.drawId} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">
                    #{d.drawId.slice(0, 8)} &middot; {d.totalSlots} slots &middot; ${d.entryDollars}
                  </div>
                  <div className="text-xs text-gray-400">
                    {d.filledSlots}/{d.totalSlots} filled &middot; {d.mode}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  d.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                  d.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
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
