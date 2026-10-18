import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // SPA: semua route di-render di browser, nginx mengarahkan route yang tidak dikenal ke index.html
    adapter: adapter({ fallback: 'index.html' }),
  },
};

export default config;
