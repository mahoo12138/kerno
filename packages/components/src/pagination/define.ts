import { define } from '@kerno/core';
import { KPagination } from './pagination.js';

define('k-pagination', KPagination);

declare global {
  interface HTMLElementTagNameMap {
    'k-pagination': KPagination;
  }
}
