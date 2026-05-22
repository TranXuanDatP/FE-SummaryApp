import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { setLogoutFn } from '../api/client';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const logoutAction = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) authApi.logout(refreshToken).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    navigate('/login');
  };

  setLogoutFn(logoutAction);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ userId: payload.sub, email: payload.email, role: payload.role });
      } catch {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  }, []);

  const loginAction = async (email: string, password: string) => {
    const data: any = await authApi.login(email, password);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
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
