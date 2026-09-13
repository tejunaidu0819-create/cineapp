import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // In production (GitHub Pages) assets must be relative to /cineapp/
  // In dev mode base stays as '/' so localhost works normally
  base: command === 'build' ? '/cineapp/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
}));
