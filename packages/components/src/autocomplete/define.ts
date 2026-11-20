import { define } from '@kerno/core';
import { KAutocomplete } from './autocomplete.js';

define('k-autocomplete', KAutocomplete);

declare global {
  interface HTMLElementTagNameMap {
    'k-autocomplete': KAutocomplete;
  }
}
