'use client';

import { useEffect, useRef, useState } from 'react';

interface SpinWheelProps {
  participants: string[];
  winnerIndex?: number;
  spinning: boolean;
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#14B8A6', '#6366F1',
];

export default function SpinWheel({ participants, winnerIndex, spinning }: SpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const count = participants.length || 1;
    const arc = (2 * Math.PI) / count;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < count; i++) {
      const angle = i * arc + rotation;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angle, angle + arc);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(14, 120 / count)}px sans-serif`;
      const name = participants[i] || `Slot ${i + 1}`;
      ctx.fillText(name.length > 10 ? name.slice(0, 10) + '..' : name, radius - 15, 4);
      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(center - 10, 5);
    ctx.lineTo(center + 10, 5);
    ctx.lineTo(center, 25);
    ctx.closePath();
    ctx.fillStyle = '#1F2937';
    ctx.fill();
  }, [participants, rotation]);

  useEffect(() => {
    if (!spinning || winnerIndex === undefined) return;

    const count = participants.length;
    if (count === 0) return;

    const arc = (2 * Math.PI) / count;
    // Spin multiple full rotations + land on winner
    const targetAngle = -(winnerIndex * arc + arc / 2) + Math.PI * 2 * 5;

    let start: number;
    const duration = 4000;

    function animate(timestamp: number) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setRotation(eased * targetAngle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [spinning, winnerIndex, participants.length]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="rounded-full shadow-lg"
      />
    </div>
  );
}
