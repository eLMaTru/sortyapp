'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface User {
  userId: string;
  email: string;
  username: string;
  role: string;
  referralCode: string;
  demoBalance: number;
  realBalance: number;
  walletAddress?: string;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.auth.me();
      setUser(data);
    } catch {
      setUser(null);
      localStorage.removeItem('sortyapp_token');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('sortyapp_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem('sortyapp_token', data.token);
    setUser(data.user);
  };

  const register = async (email: string, username: string, password: string, referralCode?: string) => {
    const data = await api.auth.register({ email, username, password, referralCode });
    localStorage.setItem('sortyapp_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('sortyapp_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
