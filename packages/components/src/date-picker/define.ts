import { define } from '@kerno/core';
import { KDatePicker } from './date-picker.js';

define('k-date-picker', KDatePicker);

declare global {
  interface HTMLElementTagNameMap {
    'k-date-picker': KDatePicker;
  }
}
