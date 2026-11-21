import { define } from '@kerno/core';
import { KRingProgress } from './ring-progress.js';

define('k-ring-progress', KRingProgress);

declare global {
  interface HTMLElementTagNameMap {
    'k-ring-progress': KRingProgress;
  }
}
