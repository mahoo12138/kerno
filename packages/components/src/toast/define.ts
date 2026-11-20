import { define } from '@kerno/core';
import { KToast, KToastContainer } from './toast.js';

define('k-toast', KToast);
define('k-toast-container', KToastContainer);

declare global {
  interface HTMLElementTagNameMap {
    'k-toast': KToast;
    'k-toast-container': KToastContainer;
  }
}
