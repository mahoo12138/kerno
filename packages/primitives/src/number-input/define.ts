import { define } from '@kerno/core';
import { KNumberInput } from './number-input.js';

define('k-number-input', KNumberInput);

declare global {
  interface HTMLElementTagNameMap {
    'k-number-input': KNumberInput;
  }
}
