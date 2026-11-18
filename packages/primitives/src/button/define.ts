import { define } from '@kerno/core';
import { KButton } from './button.js';

define('k-button', KButton);

declare global {
  interface HTMLElementTagNameMap {
    'k-button': KButton;
  }
}

export { KButton };
