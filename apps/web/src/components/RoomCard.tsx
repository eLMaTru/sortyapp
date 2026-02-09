'use client';

import Link from 'next/link';

interface RoomCardProps {
  draw: {
    drawId: string;
    totalSlots: number;
    entryDollars: number;
    filledSlots: number;
    status: string;
    mode: string;
    winnerUsername?: string;
  };
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800',
  FULL: 'bg-yellow-100 text-yellow-800',
  COUNTDOWN: 'bg-orange-100 text-orange-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
};

export default function RoomCard({ draw }: RoomCardProps) {
  const spotsLeft = draw.totalSlots - draw.filledSlots;
  const progress = (draw.filledSlots / draw.totalSlots) * 100;

  return (
    <Link
      href={`/rooms/${draw.drawId}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-lg font-bold">${draw.entryDollars}</span>
          <span className="text-gray-500 text-sm ml-1">entry</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[draw.status] || ''}`}>
          {draw.status}
        </span>
      </div>

      <div className="text-sm text-gray-600 mb-2">
        {draw.totalSlots} slots &middot; Pool: ${draw.entryDollars * draw.totalSlots * 0.9}
      </div>

      {draw.status === 'OPEN' && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className="bg-brand-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">
            {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
          </div>
        </>
      )}

      {draw.status === 'COMPLETED' && draw.winnerUsername && (
        <div className="text-sm mt-1">
          Selected: <span className="font-medium">{draw.winnerUsername}</span>
        </div>
      )}
    </Link>
  );
}
