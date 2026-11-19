import { define } from '@kerno/core';
import { KSlider } from './slider.js';

define('k-slider', KSlider);

declare global {
  interface HTMLElementTagNameMap {
    'k-slider': KSlider;
  }
}

export { KSlider };
