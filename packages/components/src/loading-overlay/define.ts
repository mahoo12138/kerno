import { define } from '@kerno/core';
import { KLoadingOverlay } from './loading-overlay.js';

define('k-loading-overlay', KLoadingOverlay);

declare global {
  interface HTMLElementTagNameMap {
    'k-loading-overlay': KLoadingOverlay;
  }
}
