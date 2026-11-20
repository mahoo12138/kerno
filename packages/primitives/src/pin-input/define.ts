import { define } from '@kerno/core';
import { KPinInput } from './pin-input.js';

define('k-pin-input', KPinInput);

declare global {
  interface HTMLElementTagNameMap {
    'k-pin-input': KPinInput;
  }
}
