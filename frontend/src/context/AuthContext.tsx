import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  doctor_profile_id?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  quickLogin: (role: 'PATIENT' | 'DOCTOR' | 'ADMIN') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (localStorage.getItem('access_token')) {
        const res = await authAPI.getMe();
        setUser(res.data);
      }
    } catch (e) {
      console.error('Session expired', e);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const res = await authAPI.login(email, password);
    const { access, refresh, user: loggedUser } = res.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setToken(access);
    setUser(loggedUser);
    return loggedUser;
  };

  const quickLogin = async (role: 'PATIENT' | 'DOCTOR' | 'ADMIN') => {
    const credentials = {
      PATIENT: { email: 'alice@example.com', password: 'patient123' },
      DOCTOR: { email: 'dr.smith@healthcare.local', password: 'doctor123' },
      ADMIN: { email: 'admin@healthcare.local', password: 'admin123' },
    };
    const { email, password } = credentials[role];
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, quickLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
