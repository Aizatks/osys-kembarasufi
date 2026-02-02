'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
    role: 'admin' | 'staff' | 'superadmin' | 'marketing' | 'c-suite' | 'pengurus' | 'tour-coordinator' | 'ejen' | 'introducer' | 'sales-marketing-manager' | 'admin-manager' | 'hr-manager' | 'finance-manager' | 'tour-coordinator-manager' | 'media-videographic' | 'media-graphic' | 'video-graphic' | 'creative-designer' | 'social-media' | 'operation' | 'finance' | 'hr';
    status: string;
    category?: string;
    isSales: boolean;
    impersonatedBy?: string;
    impersonatorName?: string;
  }
  
  interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; needsApproval?: boolean }>;
    logout: () => void;
      isAdmin: boolean;
      isSuperAdmin: boolean;
      isMarketing: boolean;
      isSales: boolean;
      isMedia: boolean;
      isVideoGraphic: boolean;
      isFinance: boolean;
      isHR: boolean;
  
    isImpersonating: boolean;
  setImpersonation: (token: string, user: User) => void;
  endImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [originalToken, setOriginalToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedOriginalToken = localStorage.getItem('original_auth_token');
    if (savedOriginalToken) {
      setOriginalToken(savedOriginalToken);
    }
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('original_auth_token');
        setToken(null);
        setOriginalToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Ralat rangkaian' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }

      return { success: true, needsApproval: true };
    } catch (error) {
      return { success: false, error: 'Ralat rangkaian' };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('original_auth_token');
    setToken(null);
    setOriginalToken(null);
    setUser(null);
  };

  const setImpersonation = (newToken: string, newUser: User) => {
    if (token && !originalToken) {
      localStorage.setItem('original_auth_token', token);
      setOriginalToken(token);
    }
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const endImpersonation = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/staff/impersonate', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        localStorage.removeItem('original_auth_token');
        setToken(data.token);
        setOriginalToken(null);
        setUser(data.user);
      }
    } catch (error) {
      console.error('End impersonation error:', error);
    }
  };

    const isAdmin = user?.role === 'admin' || 
                    user?.role === 'superadmin' || 
                    user?.role === 'c-suite' || 
                    user?.role === 'pengurus' ||
                    user?.role === 'sales-marketing-manager' ||
                    user?.role === 'admin-manager' ||
                    user?.role === 'hr-manager' ||
                    user?.role === 'finance-manager' ||
                    user?.role === 'tour-coordinator-manager';
    const isSuperAdmin = user?.role === 'superadmin';
    const isMarketing = user?.role === 'marketing' || user?.role === 'sales-marketing-manager';
    const isMedia = isAdmin || isMarketing || user?.role === 'media-videographic';
    const isVideoGraphic = isAdmin || isMarketing || user?.role === 'media-videographic';
    const isFinance = isAdmin || user?.role === 'finance' || user?.role === 'finance-manager';
    const isHR = isAdmin || user?.role === 'hr' || user?.role === 'hr-manager';
    const isSales = user?.role === 'staff' || user?.role === 'ejen' || user?.role === 'sales-marketing-manager' || user?.role === 'marketing';
    const isAgent = user?.role === 'ejen' || user?.role === 'introducer';
    const isStaff = user?.role !== 'ejen' && user?.role !== 'introducer' && !!user?.role;
    const isImpersonating = !!user?.impersonatedBy;

      const contextValue = React.useMemo(() => ({
        user,
        token,
        isLoading,
        login,
        register,
        callback: () => {}, // placeholder
        logout,
        isAdmin,
        isSuperAdmin,
        isMarketing,
        isSales,
        isMedia,
        isVideoGraphic,
        isFinance,
        isHR,
        isAgent,
        isStaff,
        isImpersonating,
        setImpersonation,
        endImpersonation,
      }), [user, token, isLoading, isAdmin, isSuperAdmin, isMarketing, isSales, isMedia, isVideoGraphic, isFinance, isHR, isAgent, isStaff, isImpersonating]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
