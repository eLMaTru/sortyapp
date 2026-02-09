'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { mode, setMode, isDemoMode } = useMode();

  const balance = user ? (isDemoMode ? user.demoBalance : user.realBalance) : 0;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-brand-700">
              SORTYAPP
            </Link>
            {user && (
              <>
                <Link href="/rooms" className="text-sm text-gray-600 hover:text-gray-900">
                  Rooms
                </Link>
                <Link href="/wallet" className="text-sm text-gray-600 hover:text-gray-900">
                  Wallet
                </Link>
                {user.role === 'ADMIN' && (
                  <Link href="/admin" className="text-sm text-red-600 hover:text-red-800">
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                {/* Mode Toggle */}
                <div className="flex rounded-lg overflow-hidden border border-gray-300">
                  <button
                    onClick={() => setMode('DEMO')}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${
                      isDemoMode
                        ? 'bg-demo text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    DEMO
                  </button>
                  <button
                    onClick={() => setMode('REAL')}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${
                      !isDemoMode
                        ? 'bg-real text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    REAL
                  </button>
                </div>

                {/* Balance */}
                <div className={`text-sm font-medium px-3 py-1 rounded ${
                  isDemoMode ? 'bg-purple-50 text-demo-dark' : 'bg-green-50 text-real-dark'
                }`}>
                  {(balance / 100).toFixed(2)} USD
                </div>

                <span className="text-sm text-gray-600">{user.username}</span>
                <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">
                  Logout
                </button>
              </>
            )}
            {!user && (
              <div className="flex gap-3">
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                  Log in
                </Link>
                <Link href="/register" className="text-sm bg-brand-600 text-white px-3 py-1 rounded hover:bg-brand-700">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
