import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // Saat `npm run dev`, path yang sama dengan nginx (lihat nginx.conf) diteruskan ke backend di Docker
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', rewrite: (path) => path.replace(/^\/api/, '') },
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
});
