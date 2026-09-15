import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { consentApi } from '../api/consentApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('dp_auth_token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('dp_auth_user');
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Synchronize authentication tokens to localStorage
  const saveSession = (authToken, authUser) => {
    setToken(authToken);
    setUser(authUser);
    setAuthError(null);
    localStorage.setItem('dp_auth_token', authToken);
    localStorage.setItem('dp_auth_user', JSON.stringify(authUser));
  };

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setAuthError(null);
    localStorage.removeItem('dp_auth_token');
    localStorage.removeItem('dp_auth_user');
  }, []);

  // Validate existing session on application boot
  useEffect(() => {
    let isMounted = true;
    const verifyExistingSession = async () => {
      const storedToken = localStorage.getItem('dp_auth_token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await consentApi.getMe();
        if (res && res.user && isMounted) {
          setUser(res.user);
          localStorage.setItem('dp_auth_user', JSON.stringify(res.user));
        } else if (isMounted) {
          clearSession();
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        if (isMounted) clearSession();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifyExistingSession();

    // Listen for global auth expired events triggered by 401 responses
    const handleAuthExpired = () => {
      clearSession();
    };
    window.addEventListener('dp-auth:expired', handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('dp-auth:expired', handleAuthExpired);
    };
  }, [clearSession]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await consentApi.login({ email, password });
      saveSession(res.access_token, res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message || 'Invalid email or password.');
      throw err;
    }
  };

  const register = async (registrationPayload) => {
    setAuthError(null);
    try {
      const res = await consentApi.register(registrationPayload);
      saveSession(res.access_token, res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const logout = () => {
    clearSession();
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    role: user?.role || null,
    isDataPrincipal: user?.role === 'DATA_PRINCIPAL',
    isDataFiduciary: user?.role === 'DATA_FIDUCIARY' || user?.role === 'ADMIN',
    loading,
    authError,
    setAuthError,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
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
