import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  root: './',
  server: {
    port: 3001,
    open: true,
    fs: {
      // Allow serving files from the monorepo root
      // Needed for @guinetik/network-js and worker files
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  // Worker support for network-js
  worker: {
    format: 'es',
    plugins: () => []
  },
  optimizeDeps: {
    exclude: ['@guinetik/network-js']
  }
});
