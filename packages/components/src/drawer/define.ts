import { define } from '@kerno/core';
import { KDrawer } from './drawer.js';

define('k-drawer', KDrawer);

declare global {
  interface HTMLElementTagNameMap {
    'k-drawer': KDrawer;
  }
}
