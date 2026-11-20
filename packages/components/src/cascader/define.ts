import { define } from '@kerno/core';
import { KCascader } from './cascader.js';

define('k-cascader', KCascader);

declare global {
  interface HTMLElementTagNameMap {
    'k-cascader': KCascader;
  }
}
