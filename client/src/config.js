/** API base URL from client/.env — all requests use this via api/client.js */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || '/api/v1';

if (import.meta.env.DEV) {
  console.info(`[API] ${API_BASE_URL}`);
}
