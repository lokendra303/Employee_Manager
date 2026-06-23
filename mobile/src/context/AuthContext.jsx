import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
        ]);
        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
          try {
            const res = await api.get('/auth/me');
            setUser(res.data.user);
            await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
          } catch {
            await AsyncStorage.multiRemove(['token', 'user']);
            setUser(null);
          }
        }
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('token', res.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setUser(null);
  };

  const updateUser = async (userData) => {
    setUser((prev) => {
      const merged = { ...prev, ...userData };
      AsyncStorage.setItem('user', JSON.stringify(merged));
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
