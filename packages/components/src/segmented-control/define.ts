import { define } from '@kerno/core';
import { KSegmentedControl } from './segmented-control.js';

define('k-segmented-control', KSegmentedControl);

declare global {
  interface HTMLElementTagNameMap {
    'k-segmented-control': KSegmentedControl;
  }
}
