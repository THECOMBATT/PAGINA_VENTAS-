import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [company, setCompany] = useState(() => {
    try {
      const stored = localStorage.getItem('company');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Validar sesión al montar
  useEffect(() => {
    let cancelled = false;

    async function verifyAuth() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.auth.me();
        if (!cancelled) {
          setUser(data.user);
          setCompany(data.company);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('company', JSON.stringify(data.company));
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Sesión no válida o expirada:', err.message);
          logout();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    verifyAuth().catch((err) => console.error('verifyAuth error:', err));

    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [token]);

  const login = async (email, password, companySlug) => {
    const res = await api.auth.login({ email, password, companySlug });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('company', JSON.stringify(res.company));
    setToken(res.token);
    setUser(res.user);
    setCompany(res.company);
    return res;
  };

  const register = async (formData) => {
    const res = await api.auth.register(formData);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('company', JSON.stringify(res.company));
    setToken(res.token);
    setUser(res.user);
    setCompany(res.company);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    setToken(null);
    setUser(null);
    setCompany(null);
  };

  const updateCompany = (updatedCompany) => {
    setCompany(updatedCompany);
    localStorage.setItem('company', JSON.stringify(updatedCompany));
  };

  const formatMoney = (amount) => {
    const val = parseFloat(amount) || 0;
    const symbol = company?.currency_symbol || '$';
    return `${symbol} ${val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        updateCompany,
        formatMoney
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
