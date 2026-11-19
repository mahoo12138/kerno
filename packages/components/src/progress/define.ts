import { define } from '@kerno/core';
import { KProgress } from './progress.js';

define('k-progress', KProgress);

declare global {
  interface HTMLElementTagNameMap {
    'k-progress': KProgress;
  }
}

export { KProgress };
