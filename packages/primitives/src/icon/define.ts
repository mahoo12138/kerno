import { define } from '@kerno/core';
import { KIcon } from './icon.js';

define('k-icon', KIcon);

declare global {
  interface HTMLElementTagNameMap {
    'k-icon': KIcon;
  }
}

export { KIcon };
