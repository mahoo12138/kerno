import { define } from '@kerno/core';
import { KCheckbox } from './checkbox.js';

define('k-checkbox', KCheckbox);

declare global {
  interface HTMLElementTagNameMap {
    'k-checkbox': KCheckbox;
  }
}

export { KCheckbox };
