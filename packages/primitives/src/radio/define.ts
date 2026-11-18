import { define } from '@kerno/core';
import { KRadio, KRadioGroup } from './radio.js';

define('k-radio', KRadio);
define('k-radio-group', KRadioGroup);

declare global {
  interface HTMLElementTagNameMap {
    'k-radio': KRadio;
    'k-radio-group': KRadioGroup;
  }
}

export { KRadio, KRadioGroup };
