import { define } from '@kerno/core';
import { KSkeleton } from './skeleton.js';

define('k-skeleton', KSkeleton);

declare global {
  interface HTMLElementTagNameMap {
    'k-skeleton': KSkeleton;
  }
}

export { KSkeleton };
