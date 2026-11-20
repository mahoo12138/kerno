import { define } from '@kerno/core';
import { KRating } from './rating.js';

define('k-rating', KRating);

declare global {
  interface HTMLElementTagNameMap {
    'k-rating': KRating;
  }
}
