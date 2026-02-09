'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import SpinWheel from '@/components/SpinWheel';
import ConfirmModal from '@/components/ConfirmModal';

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const [draw, setDraw] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState('');

  const fetchDraw = useCallback(async () => {
    try {
      const data = await api.draws.get(id);
      setDraw(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDraw();
    const interval = setInterval(fetchDraw, 3000);
    return () => clearInterval(interval);
  }, [fetchDraw]);

  useEffect(() => {
    if (draw?.status === 'COMPLETED' && draw.winnerId) {
      setSpinning(true);
    }
  }, [draw?.status, draw?.winnerId]);

  const handleJoin = async () => {
    setShowConfirm(false);
    setJoining(true);
    setError('');
    try {
      const updated = await api.draws.join(id);
      setDraw(updated);
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading draw...</p>;
  if (!draw) return <p className="text-red-500">Draw not found.</p>;

  const participants = Object.values(draw.participantUsernames || {}) as string[];
  const hasJoined = user && draw.participants?.includes(user.userId);
  const canJoin = user && draw.status === 'OPEN' && !hasJoined;

  const winnerIndex = draw.winnerId
    ? draw.participants.indexOf(draw.winnerId)
    : undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Room #{draw.drawId.slice(0, 8)}</h1>
          <p className="text-gray-500 text-sm">
            {draw.totalSlots} slots &middot; ${draw.entryDollars} entry &middot; {draw.mode} mode
          </p>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
          draw.status === 'OPEN' ? 'bg-green-100 text-green-800' :
          draw.status === 'COUNTDOWN' ? 'bg-orange-100 text-orange-800' :
          draw.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
          draw.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {draw.status}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{error}</div>
      )}

      <div className="flex justify-center mb-6">
        <SpinWheel
          participants={participants}
          winnerIndex={winnerIndex}
          spinning={spinning}
        />
      </div>

      {draw.status === 'COUNTDOWN' && draw.countdownEndsAt && (
        <CountdownTimer endsAt={draw.countdownEndsAt} />
      )}

      {draw.status === 'COMPLETED' && draw.winnerUsername && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center mb-6">
          <p className="text-sm text-yellow-800">Selected User</p>
          <p className="text-xl font-bold text-yellow-900">{draw.winnerUsername}</p>
          <p className="text-sm text-yellow-700">
            Prize: ${(draw.prize / 100).toFixed(2)} USD
          </p>
        </div>
      )}

      {canJoin && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={joining}
          className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 mb-6"
        >
          {joining ? 'Joining...' : `Participate - $${draw.entryDollars}`}
        </button>
      )}

      {hasJoined && draw.status !== 'COMPLETED' && (
        <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded mb-6 text-center">
          You are participating in this draw.
        </div>
      )}

      <div className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="font-semibold mb-3">
          Participants ({draw.filledSlots}/{draw.totalSlots})
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: draw.totalSlots }).map((_, i) => {
            const uid = draw.participants?.[i];
            const name = uid ? draw.participantUsernames[uid] : null;
            return (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded ${
                  name
                    ? uid === draw.winnerId
                      ? 'bg-yellow-100 text-yellow-800 font-medium'
                      : 'bg-gray-100 text-gray-800'
                    : 'bg-gray-50 text-gray-400 border border-dashed border-gray-200'
                }`}
              >
                {name || `Slot ${i + 1} - Open`}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="font-semibold mb-3">Draw Details</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Pool</dt>
          <dd className="font-medium">${(draw.pool / 100).toFixed(2)}</dd>
          <dt className="text-gray-500">Fee ({draw.feePercent}%)</dt>
          <dd className="font-medium">${(draw.fee / 100).toFixed(2)}</dd>
          <dt className="text-gray-500">Prize</dt>
          <dd className="font-medium">${(draw.prize / 100).toFixed(2)}</dd>
          <dt className="text-gray-500">Created</dt>
          <dd>{new Date(draw.createdAt).toLocaleString()}</dd>
        </dl>
      </div>

      {draw.status === 'COMPLETED' && draw.commitHash && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Fairness Verification</h3>
          <dl className="text-xs font-mono space-y-2 break-all">
            <dt className="text-gray-500 text-sm font-sans">Commit Hash</dt>
            <dd>{draw.commitHash}</dd>
            <dt className="text-gray-500 text-sm font-sans">Public Seed</dt>
            <dd>{draw.publicSeed}</dd>
            <dt className="text-gray-500 text-sm font-sans">Server Seed (revealed)</dt>
            <dd>{draw.revealedServerSeed}</dd>
          </dl>
          <p className="text-xs text-gray-400 mt-3">
            Verify: SHA256(serverSeed + publicSeed) should equal the commit hash.
          </p>
        </div>
      )}

      <ConfirmModal
        open={showConfirm}
        title="Confirm Participation"
        message={`You are about to join this draw for $${draw.entryDollars} (${draw.entryCredits} credits). Once you join, you cannot exit or cancel. Do you want to proceed?`}
        confirmLabel="Yes, Participate"
        onConfirm={handleJoin}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center mb-6">
      <p className="text-sm text-orange-700">Drawing in</p>
      <p className="text-3xl font-bold text-orange-900">{seconds}s</p>
    </div>
  );
}
