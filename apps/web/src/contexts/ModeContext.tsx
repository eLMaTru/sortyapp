'use client';

import React, { createContext, useContext, useState } from 'react';

type WalletMode = 'DEMO' | 'REAL';

interface ModeContextValue {
  mode: WalletMode;
  setMode: (mode: WalletMode) => void;
  isDemoMode: boolean;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<WalletMode>('DEMO');

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
