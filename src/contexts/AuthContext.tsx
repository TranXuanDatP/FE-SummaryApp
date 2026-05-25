import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { setLogoutFn } from '../api/client';
import type { LoginResponse } from '../types/api';

interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginAction: (email: string, password: string) => Promise<void>;
  logoutAction: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

function parseJwtPayload(token: string): { sub: string; email: string; role: string } {
  return JSON.parse(atob(token.split('.')[1]));
}

/* eslint-disable react-refresh/only-export-components */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const logoutAction = useCallback(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) void authApi.logout(refreshToken).catch(() => { /* ignored: session cleanup */ });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    setLogoutFn(logoutAction);
  }, [logoutAction]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = parseJwtPayload(token);
        setUser({ userId: payload.sub, email: payload.email, role: payload.role });
      } catch {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  }, []);

  const loginAction = async (email: string, password: string) => {
    const data = (await authApi.login(email, password)) as unknown as LoginResponse;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const payload = parseJwtPayload(data.accessToken);
    setUser({ userId: payload.sub, email: payload.email, role: payload.role });
    navigate('/');
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, loading, loginAction, logoutAction }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
