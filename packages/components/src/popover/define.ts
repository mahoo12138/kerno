import { define } from '@kerno/core';
import { KPopover } from './popover.js';

define('k-popover', KPopover);

declare global {
  interface HTMLElementTagNameMap {
    'k-popover': KPopover;
  }
}

export { KPopover };
