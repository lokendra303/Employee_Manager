import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiBaseUrl, testApiConnection } from '../api/client';
import {
  API_STORAGE_KEY,
  getEnvDefaultUrl,
  normalizeApiUrl,
} from '../constants/apiStorage';

const ApiConfigContext = createContext(null);

export function ApiConfigProvider({ children }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [apiBaseUrl, setApiBaseUrlState] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedUrl = await AsyncStorage.getItem(API_STORAGE_KEY);
        const url = storedUrl || getEnvDefaultUrl();
        if (url) {
          setApiBaseUrl(url);
          setApiBaseUrlState(url);
          setInputUrl(url);
        }
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  const saveApiUrl = async (rawUrl, { testBeforeSave = false } = {}) => {
    setSaving(true);
    try {
      const url = normalizeApiUrl(rawUrl);

      if (testBeforeSave) {
        setTesting(true);
        const ok = await testApiConnection(url);
        setTesting(false);
        if (!ok) throw new Error('Server responded but health check failed');
      }

      await AsyncStorage.setItem(API_STORAGE_KEY, url);
      setApiBaseUrl(url);
      setApiBaseUrlState(url);
      setInputUrl(url);
      return url;
    } finally {
      setSaving(false);
      setTesting(false);
    }
  };

  const testUrl = async (rawUrl) => {
    setTesting(true);
    try {
      const url = normalizeApiUrl(rawUrl || inputUrl || apiBaseUrl);
      const ok = await testApiConnection(url);
      if (!ok) throw new Error('Health check failed');
      return true;
    } finally {
      setTesting(false);
    }
  };

  return (
    <ApiConfigContext.Provider
      value={{
        apiBaseUrl,
        inputUrl,
        setInputUrl,
        bootstrapping,
        testing,
        saving,
        saveApiUrl,
        testUrl,
      }}
    >
      {children}
    </ApiConfigContext.Provider>
  );
}

export function useApiConfig() {
  const ctx = useContext(ApiConfigContext);
  if (!ctx) throw new Error('useApiConfig must be used within ApiConfigProvider');
  return ctx;
}
