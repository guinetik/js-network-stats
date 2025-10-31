import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    target: 'esnext', // Match library target for private class fields
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
  },
  esbuild: {
    target: 'esnext' // Ensure esbuild doesn't downlevel private fields
  }
  // NO ALIASES! Let package.json exports do their job!
});
