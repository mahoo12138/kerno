import { define } from '@kerno/core';
import { KIndicator } from './indicator.js';

define('k-indicator', KIndicator);

declare global {
  interface HTMLElementTagNameMap {
    'k-indicator': KIndicator;
  }
}
