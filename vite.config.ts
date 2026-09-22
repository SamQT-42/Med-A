import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The browser never holds a key. If the optional AI server is running,
// /api/* is proxied to it; otherwise the app stays on the scripted provider.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
  // Same proxy for `npm run preview`, so the optional AI server works there too.
  preview: {
    port: 4173,
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
});
