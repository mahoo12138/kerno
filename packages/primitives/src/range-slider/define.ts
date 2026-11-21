import { define } from '@kerno/core';
import { KRangeSlider } from './range-slider.js';

define('k-range-slider', KRangeSlider);

declare global {
  interface HTMLElementTagNameMap {
    'k-range-slider': KRangeSlider;
  }
}
