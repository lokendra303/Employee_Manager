import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiUrl = env.VITE_API_URL?.trim() || '/api/v1';
  const useProxy = apiUrl.startsWith('/');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      ...(useProxy && {
        proxy: {
          '/api': {
            target: env.VITE_PROXY_TARGET || 'http://localhost:5000',
            changeOrigin: true,
          },
        },
      }),
    },
  };
});
