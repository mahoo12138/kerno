import { define } from '@kerno/core';
import { KList, KListItem } from './list.js';

define('k-list', KList);
define('k-list-item', KListItem);

declare global {
  interface HTMLElementTagNameMap {
    'k-list': KList;
    'k-list-item': KListItem;
  }
}
