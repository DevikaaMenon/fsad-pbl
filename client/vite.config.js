import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite compiles JSX to plain JavaScript at build time.
// In development, /api requests are forwarded to the Express server,
// so the browser sees one origin, just like in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
