import { define } from '@kerno/core';
import { KKbd } from './kbd.js';

define('k-kbd', KKbd);

declare global {
  interface HTMLElementTagNameMap {
    'k-kbd': KKbd;
  }
}
