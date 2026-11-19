import { define } from '@kerno/core';
import { KFormField } from './form-field.js';

define('k-form-field', KFormField);

declare global {
  interface HTMLElementTagNameMap {
    'k-form-field': KFormField;
  }
}

export { KFormField };
