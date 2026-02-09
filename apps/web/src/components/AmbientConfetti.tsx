'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * Ambient confetti that continuously fires gentle particles.
 * Used on home, login, and register pages for visual flair.
 */
export default function AmbientConfetti() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fire = () => {
      // Left side
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#0066FF', '#FF3333', '#00CC00', '#FFA500'],
        ticks: 200,
        gravity: 0.8,
        scalar: 0.8,
        drift: 0.5,
        disableForReducedMotion: true,
      });
      // Right side
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#0066FF', '#FF3333', '#00CC00', '#FFA500'],
        ticks: 200,
        gravity: 0.8,
        scalar: 0.8,
        drift: -0.5,
        disableForReducedMotion: true,
      });
    };

    // Start after a short delay
    const timeout = setTimeout(() => {
      fire();
      intervalRef.current = setInterval(fire, 2500);
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
