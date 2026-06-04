import { defineConfig } from 'vite';

export default defineConfig({
  // Repo name — required so asset URLs resolve on GitHub Pages
  // (https://jayrhic3.github.io/faxedge-landing/)
  base: '/faxedge-landing/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0, // never inline GLB/large assets
  },
  server: {
    open: true,
  },
});
