import { define } from '@kerno/core';
import { KCopyButton } from './copy-button.js';

define('k-copy-button', KCopyButton);

declare global {
  interface HTMLElementTagNameMap {
    'k-copy-button': KCopyButton;
  }
}
