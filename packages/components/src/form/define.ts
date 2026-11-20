import { define } from '@kerno/core';
import { KForm } from './form.js';

define('k-form', KForm);

declare global {
  interface HTMLElementTagNameMap {
    'k-form': KForm;
  }
}
