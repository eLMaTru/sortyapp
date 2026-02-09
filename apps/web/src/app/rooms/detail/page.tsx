'use client';

import { Suspense } from 'react';
import RoomDetail from '@/components/RoomDetail';

export default function RoomDetailPage() {
  return (
    <Suspense fallback={<p className="text-gray-500 dark:text-gray-400">Loading...</p>}>
      <RoomDetail />
    </Suspense>
  );
}
