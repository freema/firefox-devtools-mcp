import { defineConfig } from 'vitest/config';
import path from 'path';

const isWindows = process.platform === 'win32';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Run tests sequentially to avoid Firefox port conflicts
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'old/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'tests/**',
        'scripts/**',
      ],
      thresholds: {
        branches: 10,
        functions: 10,
        lines: 10,
        statements: 10,
      },
    },
    include: ['tests/**/*.test.ts'],
    // Skip integration tests on Windows due to selenium-webdriver hanging issue
    // See: https://github.com/elastic/kibana/issues/52053
    exclude: isWindows
      ? ['node_modules', 'dist', 'tests/integration/**']
      : ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
