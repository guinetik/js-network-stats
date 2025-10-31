/**
 * Vite configuration for @guinetik/network-js library build
 *
 * Builds both:
 * 1. Main library (dist/index.js)
 * 2. Worker file (dist/network-worker.js)
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'esnext', // Support private class fields
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.js'),
        'network-worker': resolve(__dirname, 'src/compute/network-worker.js'),
        'worker-url': resolve(__dirname, 'src/worker-url.js')
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: ['@guinetik/logger'],
      output: {
        preserveModules: false
      }
    },
    sourcemap: true,
    outDir: 'dist'
  }
});
