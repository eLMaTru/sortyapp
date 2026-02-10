'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import SpinWheel from '@/components/SpinWheel';
import ConfirmModal from '@/components/ConfirmModal';
import WinnerCelebration from '@/components/WinnerCelebration';

const CHAT_MAX = 5;
const CHAT_TTL_MINUTES = 5;

export default function RoomDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [draw, setDraw] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinDone, setSpinDone] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('sorty-muted') === '1';
    return false;
  });
  const spinTriggeredRef = useRef(false);
  const initialLoadRef = useRef(true);

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem('sorty-muted', next ? '1' : '0');
      return next;
    });
  };

  // Scroll to top when entering a room
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const fetchDraw = useCallback(async () => {
    try {
      const data = await api.draws.get(id);
      // If draw is already COMPLETED on first load, skip animation and show results directly
      if (initialLoadRef.current && data.status === 'COMPLETED') {
        setSpinDone(true);
        spinTriggeredRef.current = true;
      }
      initialLoadRef.current = false;
      setDraw(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDraw();
    // Pause polling once winnerId is known and wheel is spinning (deceleration phase)
    if (draw?.winnerId && spinning) return;
    // Poll faster during COUNTDOWN (1s), 3s otherwise
    const pollInterval = draw?.status === 'COUNTDOWN' ? 1000 : 3000;
    const interval = setInterval(fetchDraw, pollInterval);
    return () => clearInterval(interval);
  }, [fetchDraw, spinning, draw?.status, draw?.winnerId]);

  // Fallback: if user opens page and draw is already COMPLETED (didn't see countdown)
  useEffect(() => {
    if (draw?.status === 'COMPLETED' && draw.winnerId && !spinTriggeredRef.current) {
      spinTriggeredRef.current = true;
      setSpinning(true);
    }
  }, [draw?.status, draw?.winnerId]);

  // When countdown ends: start pre-spin immediately + fetch to trigger finalizeDraw
  const handleCountdownEnd = useCallback(() => {
    if (!spinTriggeredRef.current) {
      spinTriggeredRef.current = true;
      setSpinning(true); // Pre-spin starts (no winner yet, just constant speed)
    }
    fetchDraw(); // API call triggers finalizeDraw, returns winnerId
  }, [fetchDraw]);

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

  if (loading) return <p className="text-gray-500 dark:text-gray-400">{t('room.loading')}</p>;
  if (!draw) return <p className="text-red-500">{t('room.notFound')}</p>;

  // Map participants in draw.participants order so winnerIndex matches wheel segments
  const participants = (draw.participants || []).map(
    (uid: string) => draw.participantUsernames?.[uid] || uid.slice(0, 8)
  );
  const hasJoined = user && draw.participants?.includes(user.userId);
  const balance = user ? (draw.mode === 'DEMO' ? user.demoBalance : user.realBalance) : 0;
  const hasEnoughBalance = balance >= (draw.entryCredits || 0);
  const canJoin = user && draw.status === 'OPEN' && !hasJoined;

  const winnerIndex = draw.winnerId
    ? draw.participants.indexOf(draw.winnerId)
    : undefined;

  // Chat is active during OPEN, COUNTDOWN, RUNNING, and 5min post-COMPLETED
  const isChatActive = ['OPEN', 'FULL', 'COUNTDOWN', 'RUNNING'].includes(draw.status) ||
    (draw.status === 'COMPLETED' && draw.completedAt &&
      Date.now() < new Date(draw.completedAt).getTime() + CHAT_TTL_MINUTES * 60 * 1000);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {t('room.title')} #{draw.drawId.slice(0, 8)}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {draw.totalSlots} {t('rooms.slots')} &middot; {draw.entryCredits?.toLocaleString()} SC {t('rooms.entry')} &middot; {draw.mode} {t('room.mode')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              {muted ? (
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" />
              ) : (
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
              )}
            </svg>
          </button>
          <span className={`text-sm font-medium px-3 py-1 rounded-full w-fit ${
            draw.status === 'OPEN' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
            draw.status === 'COUNTDOWN' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
            draw.status === 'RUNNING' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
            draw.status === 'COMPLETED' ? 'bg-gray-100 dark:bg-surface-dark-3 text-gray-800 dark:text-gray-300' :
            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
          }`}>
            {draw.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-3 rounded mb-4">{error}</div>
      )}

      <div className="flex justify-center mb-6">
        <SpinWheel
          participants={participants}
          winnerIndex={winnerIndex}
          spinning={spinning}
          onSpinComplete={() => { setSpinDone(true); refreshUser(); }}
        />
      </div>

      {draw.status === 'COUNTDOWN' && draw.countdownEndsAt && (
        <CountdownTimer endsAt={draw.countdownEndsAt} onCountdownEnd={handleCountdownEnd} />
      )}

      <WinnerCelebration trigger={spinDone && !!draw.winnerUsername} muted={muted} />

      {draw.status === 'COMPLETED' && draw.winnerUsername && spinDone && (
        <div className="bg-accent-gold/10 border border-accent-gold/30 rounded-lg p-4 text-center mb-6 animate-fade-in">
          <p className="text-sm text-accent-orange">{t('room.selectedUser')}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{draw.winnerUsername}</p>
          <p className="text-sm text-accent-orange">
            {t('room.prize')}: {draw.prize?.toLocaleString()} SC
          </p>
          <Link
            href="/rooms"
            className="mt-3 inline-block bg-brand-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-600 transition-colors"
          >
            {t('home.browse')}
          </Link>
        </div>
      )}

      {canJoin && hasEnoughBalance && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={joining}
          className="w-full bg-room text-white py-3 rounded-lg font-medium hover:bg-room-dark disabled:opacity-50 mb-6"
        >
          {joining ? t('room.joining') : `${t('room.participate')} - ${draw.entryCredits?.toLocaleString()} SC`}
        </button>
      )}

      {canJoin && !hasEnoughBalance && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            {t('room.insufficientBalance')
              .replace('${needed}', draw.entryCredits?.toLocaleString())
              .replace('${balance}', balance.toLocaleString())}
          </p>
          {draw.mode === 'REAL' && (
            <Link href="/deposit" className="inline-block mt-2 text-sm font-medium text-brand-500 hover:text-brand-600 hover:underline">
              {t('room.rechargeLink')}
            </Link>
          )}
        </div>
      )}

      {hasJoined && draw.status !== 'COMPLETED' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm p-3 rounded mb-6 text-center">
          {t('room.joined')}
        </div>
      )}

      {!hasJoined && draw.status !== 'OPEN' && draw.status !== 'COMPLETED' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">{t('room.full')}</p>
          <Link href="/rooms" className="text-sm text-brand-500 hover:underline font-medium">
            {t('room.browseOther')}
          </Link>
        </div>
      )}

      <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4 mb-6">
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
          {t('room.participants')} ({draw.filledSlots}/{draw.totalSlots})
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
                    ? uid === draw.winnerId && spinDone
                      ? 'bg-accent-gold/20 text-accent-orange font-medium'
                      : 'bg-gray-100 dark:bg-surface-dark-3 text-gray-800 dark:text-gray-300'
                    : 'bg-gray-50 dark:bg-surface-dark text-gray-400 border border-dashed border-gray-200 dark:border-surface-dark-3'
                }`}
              >
                {name || `${t('room.slotOpen').replace('Slot', `Slot ${i + 1}`).replace('Lugar', `Lugar ${i + 1}`)}`}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4 mb-6">
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('room.drawDetails')}</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500 dark:text-gray-400">{t('room.pool')}</dt>
          <dd className="font-medium text-gray-900 dark:text-white">{draw.pool?.toLocaleString()} SC</dd>
          <dt className="text-gray-500 dark:text-gray-400">{t('room.fee')} ({draw.feePercent}%)</dt>
          <dd className="font-medium text-gray-900 dark:text-white">{draw.fee?.toLocaleString()} SC</dd>
          <dt className="text-gray-500 dark:text-gray-400">{t('room.prize')}</dt>
          <dd className="font-medium text-gray-900 dark:text-white">{draw.prize?.toLocaleString()} SC</dd>
          <dt className="text-gray-500 dark:text-gray-400">{t('room.created')}</dt>
          <dd className="text-gray-900 dark:text-white">{new Date(draw.createdAt).toLocaleString()}</dd>
        </dl>
      </div>

      {/* Chat section - below draw details */}
      {draw.filledSlots > 0 && (isChatActive || draw.status === 'COMPLETED') && (
        <RoomChat drawId={id} draw={draw} isChatActive={!!isChatActive} />
      )}

      {draw.status === 'COMPLETED' && draw.commitHash && (
        <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 p-4">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('room.fairness')}</h3>
          <dl className="text-xs font-mono space-y-2 break-all">
            <dt className="text-gray-500 dark:text-gray-400 text-sm font-sans">{t('room.commitHash')}</dt>
            <dd className="text-gray-900 dark:text-gray-300">{draw.commitHash}</dd>
            <dt className="text-gray-500 dark:text-gray-400 text-sm font-sans">{t('room.publicSeed')}</dt>
            <dd className="text-gray-900 dark:text-gray-300">{draw.publicSeed}</dd>
            <dt className="text-gray-500 dark:text-gray-400 text-sm font-sans">{t('room.serverSeed')}</dt>
            <dd className="text-gray-900 dark:text-gray-300">{draw.revealedServerSeed}</dd>
          </dl>
          <p className="text-xs text-gray-400 mt-3">
            {t('room.verifyHint')}
          </p>
        </div>
      )}

      <ConfirmModal
        open={showConfirm}
        title={t('confirm.title')}
        message={`${t('confirm.message').replace('${amount}', `${draw.entryCredits?.toLocaleString()} SC`).replace('${credits}', draw.entryCredits)}`}
        confirmLabel={t('confirm.yes')}
        onConfirm={handleJoin}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

// ─── Chat Component ───────────────────────────────────────────────────────────
function RoomChat({ drawId, draw, isChatActive }: { drawId: string; draw: any; isChatActive: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasJoined = user && draw.participants?.includes(user.userId);

  // Count user's messages in this draw
  const userMsgCount = user ? messages.filter((m) => m.userId === user.userId).length : 0;
  const msgsRemaining = CHAT_MAX - userMsgCount;

  // Poll for messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const msgs = await api.draws.chatMessages(drawId);
        setMessages(msgs);
      } catch { /* ignore */ }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [drawId]);

  // Auto-scroll within chat container only (not the whole page)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !hasJoined || msgsRemaining <= 0) return;
    setSending(true);
    setChatError('');
    try {
      const msg = await api.draws.sendChatMessage(drawId, input.trim());
      setMessages((prev) => [...prev, msg]);
      setInput('');
    } catch (err: any) {
      setChatError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-surface-dark-2 rounded-lg border border-gray-200 dark:border-surface-dark-3 mb-6 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-surface-dark-3 flex justify-between items-center">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{t('chat.title')}</h3>
        {hasJoined && isChatActive && (
          <span className="text-xs text-gray-400">{msgsRemaining} {t('chat.remaining')}</span>
        )}
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="h-40 overflow-y-auto px-4 py-2 space-y-1.5">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t('chat.noMessages')}</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.messageId} className="flex gap-2 text-xs">
              <span className={`font-semibold shrink-0 ${
                msg.userId === user?.userId ? 'text-brand-500' : 'text-gray-600 dark:text-gray-300'
              }`}>
                {msg.username}:
              </span>
              <span className="text-gray-700 dark:text-gray-400 break-words min-w-0">{msg.content}</span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      {isChatActive ? (
        !user ? (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-surface-dark-3 text-xs text-gray-400 text-center">
            {t('chat.loginToChat')}
          </div>
        ) : !hasJoined ? (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-surface-dark-3 text-xs text-gray-400 text-center">
            {t('chat.onlyParticipants')}
          </div>
        ) : (
          <form onSubmit={handleSend} className="border-t border-gray-200 dark:border-surface-dark-3 flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={140}
              disabled={sending || msgsRemaining <= 0}
              placeholder={msgsRemaining <= 0 ? `${CHAT_MAX}/${CHAT_MAX}` : t('chat.placeholder')}
              className="flex-1 px-3 py-2 text-xs bg-transparent dark:text-white focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || msgsRemaining <= 0}
              className="px-3 py-2 text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-30"
            >
              {t('chat.send')}
            </button>
          </form>
        )
      ) : (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-surface-dark-3 text-xs text-gray-400 text-center">
          {t('chat.closed')}
        </div>
      )}
      {chatError && (
        <div className="px-4 py-1 text-xs text-red-500">{chatError}</div>
      )}
    </div>
  );
}

function CountdownTimer({ endsAt, onCountdownEnd }: { endsAt: string; onCountdownEnd?: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        onCountdownEnd?.();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onCountdownEnd]);

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center mb-6">
      <p className="text-sm text-orange-700 dark:text-orange-300">Drawing in</p>
      <p className="text-3xl font-bold text-orange-900 dark:text-orange-200">{seconds}s</p>
    </div>
  );
}
