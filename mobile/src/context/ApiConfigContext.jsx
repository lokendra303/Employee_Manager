import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPublicConfig, setApiBaseUrl, testApiConnection } from '../api/client';
import api from '../api/client';
import {
  API_STORAGE_KEY,
  getEnvDefaultUrl,
  normalizeApiUrl,
} from '../constants/apiStorage';

const ApiConfigContext = createContext(null);

async function applyUrl(url, { persist = true } = {}) {
  if (persist) {
    await AsyncStorage.setItem(API_STORAGE_KEY, url);
  }
  setApiBaseUrl(url);
  return url;
}

export function ApiConfigProvider({ children }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [apiBaseUrl, setApiBaseUrlState] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const storedUrl = await AsyncStorage.getItem(API_STORAGE_KEY);
        const bootstrap = storedUrl || getEnvDefaultUrl();
        let resolved = bootstrap;

        if (bootstrap) {
          setApiBaseUrl(bootstrap);
          setApiBaseUrlState(bootstrap);
          setInputUrl(bootstrap);

          const serverUrl = await fetchPublicConfig(bootstrap);
          if (serverUrl) {
            resolved = serverUrl;
            await applyUrl(serverUrl);
            setApiBaseUrlState(serverUrl);
            setInputUrl(serverUrl);
          }
        }

        if (!resolved) {
          setConfigError('Server not configured. Ask your system administrator to set the API URL.');
        }
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  const saveApiUrl = async (rawUrl, { testBeforeSave = false, saveToServer = false } = {}) => {
    setSaving(true);
    setConfigError('');
    try {
      const url = normalizeApiUrl(rawUrl);

      if (testBeforeSave) {
        setTesting(true);
        const ok = await testApiConnection(url);
        setTesting(false);
        if (!ok) throw new Error('Server responded but health check failed');
      }

      await applyUrl(url);
      setApiBaseUrlState(url);
      setInputUrl(url);

      if (saveToServer) {
        await api.put('/system/settings/api-url', { apiBaseUrl: url });
      }

      return url;
    } finally {
      setSaving(false);
      setTesting(false);
    }
  };

  const syncFromServer = useCallback(async () => {
    const bootstrap = apiBaseUrl || getEnvDefaultUrl();
    if (!bootstrap) return null;
    const serverUrl = await fetchPublicConfig(bootstrap);
    if (serverUrl && serverUrl !== apiBaseUrl) {
      await applyUrl(serverUrl);
      setApiBaseUrlState(serverUrl);
      setInputUrl(serverUrl);
      setConfigError('');
    }
    return serverUrl;
  }, [apiBaseUrl]);

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
        configError,
        saveApiUrl,
        syncFromServer,
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
