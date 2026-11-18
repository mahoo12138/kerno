import { define } from '@kerno/core';
import { KSurface } from './surface.js';

define('k-surface', KSurface);

declare global {
  interface HTMLElementTagNameMap {
    'k-surface': KSurface;
  }
}

export { KSurface };
