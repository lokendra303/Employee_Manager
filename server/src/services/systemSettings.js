import prisma from '../lib/prisma.js';

export const API_BASE_URL_KEY = 'public_api_base_url';

function normalizeApiUrl(input) {
  let url = input.trim().replace(/\/+$/, '');
  if (!url) throw new Error('API URL is required');
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('URL must start with http:// or https://');
  }
  if (url.endsWith('/api/v1')) return url;
  if (url.endsWith('/api')) return `${url}/v1`;
  return `${url}/api/v1`;
}

export async function getPublicApiBaseUrl() {
  const row = await prisma.systemSetting.findUnique({
    where: { key: API_BASE_URL_KEY },
  });
  return row?.value?.trim() || null;
}

export async function setPublicApiBaseUrl(rawUrl, updatedById = null) {
  const value = normalizeApiUrl(rawUrl);
  return prisma.systemSetting.upsert({
    where: { key: API_BASE_URL_KEY },
    create: { key: API_BASE_URL_KEY, value, updatedBy: updatedById },
    update: { value, updatedBy: updatedById },
  });
}

export { normalizeApiUrl };
