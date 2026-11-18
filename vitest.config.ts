import { playwright } from '@vitest/browser-playwright';
import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';
import { standardDecorators } from './scripts/vite-standard-decorators.ts';

export default defineConfig({
  plugins: [standardDecorators()],
  resolve: {
    // Resolve workspace packages to their TypeScript sources (no prebuild needed).
    conditions: ['source', ...defaultClientConditions],
  },
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
