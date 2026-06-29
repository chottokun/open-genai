import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      './runtimeConfig': './runtimeConfig.browser',
    },
  },
  // Open GENAI: Docker コンテナ内から起動するため 0.0.0.0 で待ち受け、
  // バインドマウント上でも HMR が効くようファイル監視をポーリングにする。
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    watch: {
      usePolling: process.env.VITE_USE_POLLING === 'true',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
});
