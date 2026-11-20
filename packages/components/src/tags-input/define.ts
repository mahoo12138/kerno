import { define } from '@kerno/core';
import { KTagsInput } from './tags-input.js';

define('k-tags-input', KTagsInput);

declare global {
  interface HTMLElementTagNameMap {
    'k-tags-input': KTagsInput;
  }
}
