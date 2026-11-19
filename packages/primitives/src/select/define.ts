import { define } from '@kerno/core';
import { KOption, KSelect } from './select.js';

define('k-select', KSelect);
define('k-option', KOption);

declare global {
  interface HTMLElementTagNameMap {
    'k-option': KOption;
    'k-select': KSelect;
  }
}

export { KOption, KSelect };
