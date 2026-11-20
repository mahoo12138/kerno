import { define } from '@kerno/core';
import { KTimePicker } from './time-picker.js';

define('k-time-picker', KTimePicker);

declare global {
  interface HTMLElementTagNameMap {
    'k-time-picker': KTimePicker;
  }
}
