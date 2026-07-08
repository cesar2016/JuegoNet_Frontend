import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { destroyEcho } from './echo';
import api from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string | null;
  whatsapp?: string | null;
  admin_id?: number | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string, inviteToken?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      api.get<User>('/me')
        .then((userData) => setUser(userData))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User; token: string }>('/login', { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, passwordConfirmation: string, inviteToken?: string) => {
      const body: Record<string, string> = { name, email, password, password_confirmation: passwordConfirmation };
      if (inviteToken) body.invite_token = inviteToken;
      await api.post('/register', body);
    },
    [],
  );

  const logout = useCallback(() => {
    destroyEcho();
    api.post('/logout').catch(() => {});
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
}
