'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const session = await authService.session();
      setUser(session?.user ? { ...session.user, role: session.user.role || 'buyer' } : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const logout = async () => {
    await authService.logout().catch(() => {});
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, refresh, logout, setUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
