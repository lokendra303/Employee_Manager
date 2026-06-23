import axios from 'axios';
import { API_BASE_URL } from '../config.js';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.error?.message || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;
