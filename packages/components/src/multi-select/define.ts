import { define } from '@kerno/core';
import { KMultiSelect } from './multi-select.js';

define('k-multi-select', KMultiSelect);

declare global {
  interface HTMLElementTagNameMap {
    'k-multi-select': KMultiSelect;
  }
}
