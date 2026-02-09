'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { api } from '@/lib/api';

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const { mode, isDemoMode } = useMode();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'transactions' | 'withdrawals'>('transactions');

  useEffect(() => {
    api.wallet.transactions().then(setTransactions).catch(console.error);
    api.wallet.withdrawals().then(setWithdrawals).catch(console.error);
  }, []);

  if (!user) return <p>Please log in.</p>;

  const balance = isDemoMode ? user.demoBalance : user.realBalance;
  const filteredTx = transactions.filter((t) => t.walletMode === mode);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const credits = Math.round(parseFloat(withdrawAmount) * 100);
    try {
      const w = await api.wallet.withdraw({ amountCredits: credits, walletAddress });
      setSuccess(`Withdrawal requested: ${w.netUSDC} USDC (fee: ${w.feeUSDC} USDC)`);
      setWithdrawAmount('');
      await refreshUser();
      const updated = await api.wallet.withdrawals();
      setWithdrawals(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Wallet</h1>

      {/* Balance */}
      <div className={`p-6 rounded-lg border mb-6 ${isDemoMode ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
        <div className="text-sm text-gray-600 mb-1">{isDemoMode ? 'Demo' : 'Real'} Balance</div>
        <div className="text-3xl font-bold">${(balance / 100).toFixed(2)}</div>
        <div className="text-sm text-gray-500 mt-1">{balance.toLocaleString()} credits</div>
      </div>

      {/* Withdrawal Form (Real mode only) */}
      {!isDemoMode && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h3 className="font-semibold mb-3">Request Withdrawal</h3>
          {error && <div className="bg-red-50 text-red-700 text-sm p-2 rounded mb-3">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-3">{success}</div>}

          <form onSubmit={handleWithdraw} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Amount (USD)</label>
              <input
                type="number"
                min="10"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Min $10"
              />
              {withdrawAmount && (
                <p className="text-xs text-gray-400 mt-1">
                  Fee (1%): ${(parseFloat(withdrawAmount) * 0.01).toFixed(2)} &middot;
                  Net: ${(parseFloat(withdrawAmount) * 0.99).toFixed(2)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Polygon Wallet Address</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                placeholder="0x..."
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Request Withdrawal'}
            </button>
          </form>
        </div>
      )}

      {isDemoMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
          Demo credits cannot be withdrawn. Switch to Real mode to manage real credits.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b mb-4">
        <button
          onClick={() => setTab('transactions')}
          className={`pb-2 text-sm font-medium ${tab === 'transactions' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500'}`}
        >
          Transactions
        </button>
        <button
          onClick={() => setTab('withdrawals')}
          className={`pb-2 text-sm font-medium ${tab === 'withdrawals' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500'}`}
        >
          Withdrawals
        </button>
      </div>

      {tab === 'transactions' && (
        <div className="bg-white rounded-lg border divide-y">
          {filteredTx.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No transactions yet.</p>
          ) : (
            filteredTx.map((tx) => (
              <div key={tx.transactionId} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm">{tx.description}</div>
                  <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</div>
                </div>
                <div className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}{(tx.amount / 100).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="bg-white rounded-lg border divide-y">
          {withdrawals.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No withdrawals yet.</p>
          ) : (
            withdrawals.map((w) => (
              <div key={w.withdrawalId} className="px-4 py-3">
                <div className="flex justify-between">
                  <div className="text-sm font-medium">${w.netUSDC} USDC</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    w.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    w.status === 'SENT' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {w.status}
                  </span>
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
      <div className="mt-6 bg-white rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Your Referral Code</h3>
        <div className="text-lg font-mono font-bold text-brand-600">{user.referralCode}</div>
        <p className="text-xs text-gray-500 mt-1">
          Share this code. When someone signs up and makes their first real deposit, you both earn $5 in real credits.
        </p>
      </div>
    </div>
  );
}
