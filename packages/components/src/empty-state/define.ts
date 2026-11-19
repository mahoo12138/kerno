import { define } from '@kerno/core';
import { KEmptyState } from './empty-state.js';

define('k-empty-state', KEmptyState);

declare global {
  interface HTMLElementTagNameMap {
    'k-empty-state': KEmptyState;
  }
}

export { KEmptyState };
