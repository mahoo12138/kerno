import { define } from '@kerno/core';
import { KOption, KSelect } from './select.js';

define('k-option', KOption);
define('k-select', KSelect);

declare global {
  interface HTMLElementTagNameMap {
    'k-option': KOption;
    'k-select': KSelect;
  }
}

export { KOption, KSelect };
