import { define } from '@kerno/core';
import { KInput } from './input.js';

define('k-input', KInput);

declare global {
  interface HTMLElementTagNameMap {
    'k-input': KInput;
  }
}

export { KInput };
