// Authentication context

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthState } from '@/types/types';
import { getAuthState, login as authLogin, logout as authLogout } from '@/services/auth';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  updateAuthUser: (user: User) => void;
  isAdmin: boolean;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(getAuthState());

  useEffect(() => {
    // Update authentication state on page load
    setAuthState(getAuthState());
  }, []);

  const login = async (username: string, password: string) => {
    const result = await authLogin(username, password);
    if (result.success) {
      setAuthState({ isAuthenticated: true, user: result.user || null });
    }
    return result;
  };

  const logout = async () => {
    await authLogout();
    setAuthState({ isAuthenticated: false, user: null });
  };

  const updateAuthUser = (user: User) => {
    setAuthState({ isAuthenticated: true, user });
    // Update localStorage with .json key
    localStorage.setItem('school_current_user.json', JSON.stringify(user));
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    updateAuthUser,
    isAdmin: authState.user?.role === 'admin',
    isTeacher: authState.user?.role === 'teacher',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
