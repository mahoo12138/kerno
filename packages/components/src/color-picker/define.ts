import { define } from '@kerno/core';
import { KColorInput, KColorPicker } from './color-picker.js';

define('k-color-picker', KColorPicker);
define('k-color-input', KColorInput);

declare global {
  interface HTMLElementTagNameMap {
    'k-color-picker': KColorPicker;
    'k-color-input': KColorInput;
  }
}
