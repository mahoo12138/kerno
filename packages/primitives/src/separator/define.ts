import { define } from '@kerno/core';
import { KSeparator } from './separator.js';

define('k-separator', KSeparator);

declare global {
  interface HTMLElementTagNameMap {
    'k-separator': KSeparator;
  }
}

export { KSeparator };
