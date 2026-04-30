import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Use Node environment for backend tests
    environment: 'node',

    // Global test setup
    globals: true,

    // Include both unit and property-based tests
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.property.test.ts',
      'src/**/*.test.ts',
    ],

    // Exclude node_modules and dist
    exclude: ['node_modules', 'dist'],

    // Timeout for property-based tests (fast-check can run many iterations)
    testTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
    },

    // Reporter
    reporter: 'verbose',
  },

  resolve: {
    alias: {
      '@models': resolve(__dirname, 'src/models'),
      '@services': resolve(__dirname, 'src/services'),
      '@api': resolve(__dirname, 'src/api'),
      '@ws': resolve(__dirname, 'src/ws'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@db': resolve(__dirname, 'src/db'),
    },
  },
});
