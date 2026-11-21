import { define } from '@kerno/core';
import { KHoverCard } from './hover-card.js';

define('k-hover-card', KHoverCard);

declare global {
  interface HTMLElementTagNameMap {
    'k-hover-card': KHoverCard;
  }
}
