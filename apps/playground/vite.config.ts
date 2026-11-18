import { defaultClientConditions, defineConfig } from 'vite';
import { standardDecorators } from '../../scripts/vite-standard-decorators.ts';

export default defineConfig({
  plugins: [standardDecorators()],
  resolve: {
    // Consume workspace packages from source for instant HMR.
    conditions: ['source', ...defaultClientConditions],
  },
});
