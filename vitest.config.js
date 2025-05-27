import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    globals: true
  },
  resolve: {
    extensions: ['.js']
  },
  esbuild: {
    target: 'es2020'
  }
}); 