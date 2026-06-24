export const API_STORAGE_KEY = '@attendance_api_base_url';

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

export function getEnvDefaultUrl() {
  return process.env.EXPO_PUBLIC_API_URL?.trim() || '';
}
