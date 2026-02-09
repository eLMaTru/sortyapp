'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold mb-4">Welcome to SORTYAPP</h1>
      <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
        Participate in draw rooms with credits. Try demo mode for free, or use real credits for real results.
      </p>

      {user ? (
        <div className="flex gap-4 justify-center">
          <Link
            href="/rooms"
            className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700"
          >
            Browse Rooms
          </Link>
          <Link
            href="/wallet"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50"
          >
            My Wallet
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50"
          >
            Log in
          </Link>
        </div>
      )}

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-left">
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-2">Demo Mode</h3>
          <p className="text-sm text-gray-600">
            Start with 10,000 demo credits. Try rooms risk-free before using real credits.
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-2">Fair Draws</h3>
          <p className="text-sm text-gray-600">
            Every draw uses commit-reveal verification. Check the seeds and hash after completion.
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-2">Instant Results</h3>
          <p className="text-sm text-gray-600">
            Rooms fill up, a 15-second countdown begins, and the result is determined automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
