import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const page = (p) => resolve(import.meta.dirname, p);

export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    rollupOptions: {
      input: {
        main: page('index.html'),
        'mentions-legales': page('legal/mentions-legales.html'),
        'politique-de-confidentialite': page('legal/politique-de-confidentialite.html'),
        'politique-des-cookies': page('legal/politique-des-cookies.html'),
      },
    },
  },
});
