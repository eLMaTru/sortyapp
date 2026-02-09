'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const { mode, isDemoMode } = useMode();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    api.wallet.transactions().then(setTransactions).catch(console.error);
  }, []);

  if (!user) return <p>Please log in.</p>;

  const filteredTx = transactions.filter((t) => t.walletMode === mode).slice(0, 10);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`p-6 rounded-lg border ${isDemoMode ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
          <div className="text-sm text-gray-600 mb-1">{isDemoMode ? 'Demo' : 'Real'} Balance</div>
          <div className="text-3xl font-bold">
            ${((isDemoMode ? user.demoBalance : user.realBalance) / 100).toFixed(2)}
          </div>
        </div>

        <div className="p-6 rounded-lg border bg-white">
          <div className="text-sm text-gray-600 mb-1">Referral Code</div>
          <div className="text-lg font-mono font-bold">{user.referralCode}</div>
          <p className="text-xs text-gray-400 mt-1">Share to earn $5 when they deposit</p>
        </div>

        <div className="p-6 rounded-lg border bg-white flex items-center justify-center">
          <Link
            href="/rooms"
            className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700"
          >
            Browse Rooms
          </Link>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Recent Transactions ({mode})</h2>
      {filteredTx.length === 0 ? (
        <p className="text-gray-500 text-sm">No transactions yet.</p>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {filteredTx.map((tx) => (
            <div key={tx.transactionId} className="px-4 py-3 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">{tx.description}</div>
                <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</div>
              </div>
              <div className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {tx.amount >= 0 ? '+' : ''}{(tx.amount / 100).toFixed(2)} USD
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
