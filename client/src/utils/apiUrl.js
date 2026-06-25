import axios from 'axios';

export function normalizeApiUrl(input) {
  let url = input.trim().replace(/\/+$/, '');
  if (!url) throw new Error('Enter API URL');
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('URL must start with http:// or https://');
  }
  if (url.endsWith('/api/v1')) return url;
  if (url.endsWith('/api')) return `${url}/v1`;
  return `${url}/api/v1`;
}

export async function testApiConnection(baseUrl) {
  const client = axios.create({ baseURL: baseUrl, timeout: 10000 });
  try {
    const res = await client.get('/health');
    if (res.data?.data?.status === 'ok') return true;
    throw new Error('Health check failed');
  } catch (err) {
    if (!err.response) {
      throw new Error(`Cannot reach ${baseUrl}. Is the backend running?`);
    }
    throw new Error(err.response?.data?.error?.message || 'Health check failed');
  }
}
