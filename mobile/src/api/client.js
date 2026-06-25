import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnvDefaultUrl } from '../constants/apiStorage';
import { AUTH_TOKEN_KEY } from '../constants/authStorage';

let currentBaseUrl = getEnvDefaultUrl();
let memoryToken = null;
let onUnauthorized = null;

export function setMemoryToken(token) {
  memoryToken = token || null;
}

export function clearMemoryToken() {
  memoryToken = null;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export function isAuthFailure(err) {
  if (!err) return false;
  if (err.code === 'INVALID_CREDENTIALS') return false;
  return (
    err.code === 'INVALID_TOKEN' ||
    err.code === 'UNAUTHORIZED' ||
    (err.status === 401 && err.code !== 'INVALID_CREDENTIALS')
  );
}

const api = axios.create({
  baseURL: currentBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export function getApiBaseUrl() {
  return currentBaseUrl;
}

export function setApiBaseUrl(url) {
  currentBaseUrl = url;
  api.defaults.baseURL = url;
}

function networkErrorMessage(baseUrl) {
  const url = baseUrl || currentBaseUrl;
  if (Platform.OS === 'web') {
    return `Cannot reach ${url}. Is backend running? Use http://localhost:5000/api/v1`;
  }
  if (Platform.OS === 'android' && /localhost|127\.0\.0\.1/i.test(url)) {
    return 'On Android use http://10.0.2.2:5000/api/v1 — not localhost.';
  }
  return `Cannot reach ${url}. Backend running? Phone/emulator: use 10.0.2.2 or PC Wi‑Fi IP.`;
}

api.interceptors.request.use(async (config) => {
  config.baseURL = currentBaseUrl;
  const token = memoryToken || (await AsyncStorage.getItem(AUTH_TOKEN_KEY));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out — check API server URL'));
    }
    if (!err.response) {
      const networkErr = new Error(networkErrorMessage());
      networkErr.isNetworkError = true;
      return Promise.reject(networkErr);
    }
    const code = err.response?.data?.error?.code;
    const message =
      err.response?.data?.error?.message || err.message || 'Request failed';
    const apiErr = new Error(message);
    apiErr.code = code;
    apiErr.status = err.response?.status;
    if (isAuthFailure(apiErr) && onUnauthorized) {
      onUnauthorized(apiErr);
    }
    return Promise.reject(apiErr);
  }
);

export async function fetchPublicConfig(bootstrapUrl) {
  const base = bootstrapUrl || currentBaseUrl;
  if (!base) return null;
  const client = axios.create({ baseURL: base, timeout: 10000 });
  try {
    const res = await client.get('/public/config');
    return res.data?.data?.apiBaseUrl?.trim() || null;
  } catch {
    return null;
  }
}

export async function testApiConnection(baseUrl) {
  const client = axios.create({ baseURL: baseUrl, timeout: 10000 });
  try {
    const res = await client.get('/health');
    return res.data?.data?.status === 'ok';
  } catch (err) {
    if (err.response?.data?.error?.code === 'NOT_FOUND') {
      throw new Error(
        'Route not found — URL must end with /api/v1 (e.g. http://10.0.2.2:5000/api/v1)'
      );
    }
    if (!err.response) {
      throw new Error(networkErrorMessage(baseUrl));
    }
    throw err;
  }
}

export default api;
