import { define } from '@kerno/core';
import { KSwitch } from './switch.js';

define('k-switch', KSwitch);

declare global {
  interface HTMLElementTagNameMap {
    'k-switch': KSwitch;
  }
}

export { KSwitch };
