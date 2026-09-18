import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { consentApi } from '../api/consentApi';

const AuthContext = createContext(null);

/**
 * Safely parse JWT payload without external dependencies
 */
export const parseJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Validate JWT structure and expiration timestamp
 */
export const isJwtValid = (token) => {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload !== 'object') return false;
  // exp is in seconds; compare against current time in ms
  if (payload.exp && typeof payload.exp === 'number') {
    if (payload.exp * 1000 <= Date.now()) {
      return false;
    }
  }
  return true;
};

export const AuthProvider = ({ children }) => {
  // Initialize in an unauthenticated state with loading: true
  // Session is ONLY marked authenticated after JWT validation + backend verification
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Synchronize authenticated session to active tab sessionStorage
  const saveSession = (authToken, authUser) => {
    setToken(authToken);
    setUser(authUser);
    setAuthError(null);
    try {
      sessionStorage.setItem('dp_session_token', authToken);
      sessionStorage.setItem('dp_session_user', JSON.stringify(authUser));
      // Ensure legacy persistent localStorage tokens are purged
      localStorage.removeItem('dp_auth_token');
      localStorage.removeItem('dp_auth_user');
    } catch (e) {
      console.warn('Failed to save session to sessionStorage:', e);
    }
  };

  // Completely wipe all session and auth data
  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setAuthError(null);
    try {
      // Clear active session storage
      sessionStorage.removeItem('dp_session_token');
      sessionStorage.removeItem('dp_session_user');
      sessionStorage.clear();
      // Purge any legacy localStorage credentials
      localStorage.removeItem('dp_auth_token');
      localStorage.removeItem('dp_auth_user');
      localStorage.removeItem('dp_active_consents');
      localStorage.removeItem('dp_audit_logs');
      localStorage.removeItem('dp_dsr_requests');
      localStorage.removeItem('dp_nominee');
    } catch (e) {
      console.warn('Failed to clear session storage:', e);
    }
  }, []);

  // Validate existing session on application boot
  useEffect(() => {
    let isMounted = true;

    const verifyExistingSession = async () => {
      // 1. Purge legacy persistent localStorage tokens so old browser sessions cannot auto-login
      try {
        localStorage.removeItem('dp_auth_token');
        localStorage.removeItem('dp_auth_user');
      } catch (e) {}

      // 2. Read only from active tab sessionStorage
      const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('dp_session_token') : null;

      // 3. Missing session token (fresh browser open) -> clear and redirect to Login
      if (!sessionToken) {
        clearSession();
        if (isMounted) setLoading(false);
        return;
      }

      // 4. Structurally invalid or expired JWT -> clear and redirect to Login
      if (!isJwtValid(sessionToken)) {
        console.warn('Active session JWT is invalid or expired. Purging session.');
        clearSession();
        if (isMounted) setLoading(false);
        return;
      }

      // 5. Cryptographically validate against backend /api/auth/me
      try {
        const res = await consentApi.getMe();
        if (res && res.user && isMounted) {
          setToken(sessionToken);
          setUser(res.user);
          sessionStorage.setItem('dp_session_user', JSON.stringify(res.user));
        } else if (isMounted) {
          console.warn('Backend rejected session validation. Clearing session.');
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

  const logout = useCallback(() => {
    clearSession();
    try {
      if (window.location.pathname !== '/' || window.location.search) {
        window.history.replaceState({}, '', '/');
      }
    } catch (e) {}
  }, [clearSession]);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user && isJwtValid(token)),
    role: user?.role || null,
    isDataPrincipal: user?.role === 'DATA_PRINCIPAL',
    isDataFiduciary: user?.role === 'DATA_FIDUCIARY' || user?.role === 'ADMIN',
    loading,
    authError,
    setAuthError,
    login,
    register,
    logout,
    clearSession
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

