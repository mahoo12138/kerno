import { define } from '@kerno/core';
import { KRadio, KRadioGroup } from './radio.js';

define('k-radio-group', KRadioGroup);
define('k-radio', KRadio);

declare global {
  interface HTMLElementTagNameMap {
    'k-radio': KRadio;
    'k-radio-group': KRadioGroup;
  }
}

export { KRadio, KRadioGroup };
