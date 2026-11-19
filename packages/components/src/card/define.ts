import { define } from '@kerno/core';
import { KCard } from './card.js';

define('k-card', KCard);

declare global {
  interface HTMLElementTagNameMap {
    'k-card': KCard;
  }
}

export { KCard };
