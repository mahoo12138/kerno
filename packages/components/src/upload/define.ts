import { define } from '@kerno/core';
import { KUpload } from './upload.js';

define('k-upload', KUpload);

declare global {
  interface HTMLElementTagNameMap {
    'k-upload': KUpload;
  }
}
