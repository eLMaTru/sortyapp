'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * Winner celebration: confetti burst + fireworks + celebration sound.
 * Renders when `trigger` becomes true.
 */
export default function WinnerCelebration({ trigger }: { trigger: boolean }) {
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!trigger || hasTriggered.current) return;
    hasTriggered.current = true;

    // Play celebration: fanfare + crowd applause
    try {
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // --- Fanfare (brass-like victory melody) ---
      const playBrass = (freq: number, start: number, dur: number) => {
        // Main tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        // Low-pass filter for warm brass sound
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq * 3;
        filter.Q.value = 1;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.12, now + start + 0.03);
        gain.gain.setValueAtTime(0.12, now + start + dur - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.start(now + start);
        osc.stop(now + start + dur);
        // Harmonic for richness
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        gain2.gain.setValueAtTime(0, now + start);
        gain2.gain.linearRampToValueAtTime(0.04, now + start + 0.03);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc2.start(now + start);
        osc2.stop(now + start + dur);
      };
      // Ta-da-da-DAAA! (triumphant fanfare)
      playBrass(392, 0, 0.15);     // G4
      playBrass(523, 0.13, 0.12);  // C5
      playBrass(659, 0.23, 0.12);  // E5
      playBrass(784, 0.33, 0.5);   // G5 (hold)
      // Second phrase
      playBrass(659, 0.85, 0.1);   // E5
      playBrass(784, 0.93, 0.12);  // G5
      playBrass(1047, 1.03, 0.7);  // C6 (triumphant hold!)

      // --- Crowd applause (filtered noise) ---
      const applauseDuration = 3;
      const bufferSize = ctx.sampleRate * applauseDuration;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          // Modulated noise that sounds like clapping
          const clap = Math.sin(i / (ctx.sampleRate * 0.02)) > 0 ? 1 : 0.3;
          data[i] = (Math.random() * 2 - 1) * clap;
        }
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      // Band-pass filter to shape like applause
      const bpFilter = ctx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.frequency.value = 3000;
      bpFilter.Q.value = 0.5;
      const applauseGain = ctx.createGain();
      noiseSource.connect(bpFilter);
      bpFilter.connect(applauseGain);
      applauseGain.connect(ctx.destination);
      // Fade in, sustain, fade out
      applauseGain.gain.setValueAtTime(0, now + 0.3);
      applauseGain.gain.linearRampToValueAtTime(0.08, now + 0.8);
      applauseGain.gain.setValueAtTime(0.08, now + 1.5);
      applauseGain.gain.linearRampToValueAtTime(0.05, now + 2.2);
      applauseGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
      noiseSource.start(now + 0.3);
      noiseSource.stop(now + 3.3);
    } catch {
      // Audio not available, skip silently
    }

    // Big confetti burst from center
    const burst = () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#0066FF', '#FF3333', '#00CC00', '#FFA500', '#FFD700'],
        ticks: 300,
        gravity: 0.6,
        scalar: 1.2,
        disableForReducedMotion: true,
      });
    };

    // Fireworks from sides
    const firework = (x: number) => {
      confetti({
        particleCount: 50,
        angle: x < 0.5 ? 60 : 120,
        spread: 80,
        origin: { x, y: 0.7 },
        colors: ['#FFD700', '#FF3333', '#0066FF', '#00CC00'],
        ticks: 250,
        gravity: 1,
        scalar: 1,
        disableForReducedMotion: true,
      });
    };

    // Staggered bursts for dramatic effect
    burst();
    setTimeout(() => firework(0.1), 300);
    setTimeout(() => firework(0.9), 500);
    setTimeout(() => burst(), 700);
    setTimeout(() => firework(0.2), 1000);
    setTimeout(() => firework(0.8), 1200);
    setTimeout(() => burst(), 1500);
  }, [trigger]);

  return null;
}
