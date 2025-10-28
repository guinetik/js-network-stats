import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        family: './family.html',
        'network-graph': './examples/network-graph.html',
        'family-tree': './examples/family-tree.html',
        'explorer': './examples/explorer.html'
      }
    }
  },
  // Worker support
  worker: {
    format: 'es',
    plugins: []
  },
  optimizeDeps: {
    exclude: ['@guinetik/network-js']
  }
});
