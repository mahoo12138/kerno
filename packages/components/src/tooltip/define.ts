import { define } from '@kerno/core';
import { KTooltip } from './tooltip.js';

define('k-tooltip', KTooltip);

declare global {
  interface HTMLElementTagNameMap {
    'k-tooltip': KTooltip;
  }
}

export { KTooltip };
