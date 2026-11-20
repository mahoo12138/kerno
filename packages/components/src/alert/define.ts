import { define } from '@kerno/core';
import { KAlert } from './alert.js';

define('k-alert', KAlert);

declare global {
  interface HTMLElementTagNameMap {
    'k-alert': KAlert;
  }
}
