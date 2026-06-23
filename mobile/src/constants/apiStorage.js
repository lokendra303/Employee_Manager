export const API_STORAGE_KEY = '@attendance_api_base_url';

export function normalizeApiUrl(input) {
  const url = input.trim().replace(/\/+$/, '');
  if (!url) throw new Error('Enter API URL');
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('URL must start with http:// or https://');
  }
  return url;
}

export function getEnvDefaultUrl() {
  return process.env.EXPO_PUBLIC_API_URL?.trim() || '';
}
