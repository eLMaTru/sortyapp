'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type WalletMode = 'DEMO' | 'REAL';

const STORAGE_KEY = 'sortyapp_mode';

function getSavedMode(): WalletMode {
  if (typeof window === 'undefined') return 'DEMO';
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'REAL' ? 'REAL' : 'DEMO';
}

interface ModeContextValue {
  mode: WalletMode;
  setMode: (mode: WalletMode) => void;
  isDemoMode: boolean;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, rawSetMode] = useState<WalletMode>(getSavedMode);

  const setMode = useCallback((m: WalletMode) => {
    rawSetMode(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  return (
    <ModeContext.Provider value={{ mode, setMode, isDemoMode: mode === 'DEMO' }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
