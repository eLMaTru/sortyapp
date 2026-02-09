'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SpinWheelProps {
  participants: string[];
  winnerIndex?: number;
  spinning: boolean;
  onSpinComplete?: () => void;
}

// Brand colors from the reference images: blue, red, green, orange quadrants
const COLORS = [
  '#0066FF', '#FF3333', '#00CC00', '#FFA500',
  '#5555FF', '#EC4899', '#00CCCC', '#F97316',
  '#8B5CF6', '#FFCC00',
];

export default function SpinWheel({ participants, winnerIndex, spinning, onSpinComplete }: SpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animatingRef = useRef(false);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const count = participants.length || 1;
    const arc = (2 * Math.PI) / count;
    const rotation = rotationRef.current;

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

    // Center circle with $ sign (matching logo)
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dollar sign in center
    ctx.fillStyle = '#0066FF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', center, center);

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(center - 12, 5);
    ctx.lineTo(center + 12, 5);
    ctx.lineTo(center, 28);
    ctx.closePath();
    ctx.fillStyle = '#FF3333';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [participants]);

  // Draw wheel on mount and when participants change
  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Spin animation
  useEffect(() => {
    if (!spinning || winnerIndex === undefined || animatingRef.current) return;

    const count = participants.length;
    if (count === 0) return;

    animatingRef.current = true;
    const arc = (2 * Math.PI) / count;
    // Pointer is at top = -π/2 in canvas coords. Land winner segment center under pointer.
    // Add 7 full rotations for dramatic spin effect.
    const targetAngle = -Math.PI / 2 - (winnerIndex * arc + arc / 2) + Math.PI * 2 * 7;

    let startTime: number | null = null;
    const duration = 7000; // 7 seconds spin

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quartic for smooth deceleration at the end
      const eased = 1 - Math.pow(1 - progress, 4);
      rotationRef.current = eased * targetAngle;
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        animatingRef.current = false;
        onSpinComplete?.();
      }
    }

    requestAnimationFrame(animate);
  }, [spinning, winnerIndex, participants.length, drawWheel, onSpinComplete]);

  return (
    <div className="flex flex-col items-center w-full max-w-[320px]">
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="rounded-full shadow-lg dark:shadow-brand-500/20 w-full h-auto"
      />
    </div>
  );
}
