import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnvDefaultUrl } from '../constants/apiStorage';

let currentBaseUrl = getEnvDefaultUrl();

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

api.interceptors.request.use(async (config) => {
  config.baseURL = currentBaseUrl;
  const token = await AsyncStorage.getItem('token');
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
      return Promise.reject(
        new Error('Cannot reach API server — check URL and network')
      );
    }
    const message =
      err.response?.data?.error?.message || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export async function testApiConnection(baseUrl) {
  const client = axios.create({ baseURL: baseUrl, timeout: 10000 });
  const res = await client.get('/health');
  return res.data?.data?.status === 'ok';
}

export default api;
