import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      reporter: ['text', 'html'],
      exclude: ['**/fixtures/**', '**/node_modules/**'],
      threshold: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
