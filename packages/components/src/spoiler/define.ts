import { define } from '@kerno/core';
import { KSpoiler } from './spoiler.js';

define('k-spoiler', KSpoiler);

declare global {
  interface HTMLElementTagNameMap {
    'k-spoiler': KSpoiler;
  }
}
