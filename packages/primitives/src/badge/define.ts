import { define } from '@kerno/core';
import { KBadge } from './badge.js';

define('k-badge', KBadge);

declare global {
  interface HTMLElementTagNameMap {
    'k-badge': KBadge;
  }
}

export { KBadge };
