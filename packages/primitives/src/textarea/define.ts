import { define } from '@kerno/core';
import { KTextarea } from './textarea.js';

define('k-textarea', KTextarea);

declare global {
  interface HTMLElementTagNameMap {
    'k-textarea': KTextarea;
  }
}
