import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, {
  clearMemoryToken,
  isAuthFailure,
  setMemoryToken,
  setUnauthorizedHandler,
} from '../api/client';
import { useApiConfig } from './ApiConfigContext';
import {
  AUTH_LAST_EMAIL_KEY,
  AUTH_REMEMBER_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  parseStoredUser,
} from '../constants/authStorage';

const AuthContext = createContext(null);

function readUserFromMeResponse(res) {
  const payload = res?.data ?? res;
  if (payload?.id) return payload;
  if (payload?.user?.id) return payload.user;
  return null;
}

export function AuthProvider({ children }) {
  const { bootstrapping: apiBootstrapping, apiBaseUrl } = useApiConfig();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const clearSession = useCallback(async () => {
    clearMemoryToken();
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    if (apiBootstrapping) return;

    let cancelled = false;

    (async () => {
      try {
        const rememberRaw = await AsyncStorage.getItem(AUTH_REMEMBER_KEY);
        const rememberLogin = rememberRaw !== 'false';
        const [token, storedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (!rememberLogin || !token) {
          return;
        }

        if (!apiBaseUrl) {
          await clearSession();
          return;
        }

        const cachedUser = parseStoredUser(storedUser);
        if (cachedUser) {
          setMemoryToken(token);
          setUser(cachedUser);
        } else {
          await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
          return;
        }

        try {
          const res = await api.get('/auth/me');
          const freshUser = readUserFromMeResponse(res);
          if (freshUser && !cancelled) {
            setUser(freshUser);
            await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(freshUser));
          }
        } catch (err) {
          if (isAuthFailure(err)) {
            await clearSession();
          }
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiBootstrapping, apiBaseUrl, clearSession]);

  const login = async (email, password, rememberLogin = true) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const nextUser = res.data?.user;
      const token = res.data?.token;

      await AsyncStorage.setItem(AUTH_REMEMBER_KEY, rememberLogin ? 'true' : 'false');
      await AsyncStorage.setItem(AUTH_LAST_EMAIL_KEY, email.trim());

      if (token) {
        setMemoryToken(token);
        if (rememberLogin) {
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
        } else {
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        }
      }

      if (nextUser) {
        setUser(nextUser);
        if (rememberLogin) {
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
        } else {
          await AsyncStorage.removeItem(AUTH_USER_KEY);
        }
      }

      return nextUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await clearSession();
  };

  const updateUser = async (userData) => {
    setUser((prev) => {
      const merged = { ...prev, ...userData };
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, bootstrapping, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

