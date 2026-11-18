import { define } from '@kerno/core';
import { KDialog } from './dialog.js';

define('k-dialog', KDialog);

declare global {
  interface HTMLElementTagNameMap {
    'k-dialog': KDialog;
  }
}

export { KDialog };
