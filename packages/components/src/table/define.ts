import { define } from '@kerno/core';
import { KTable } from './table.js';

define('k-table', KTable);

declare global {
  interface HTMLElementTagNameMap {
    'k-table': KTable;
  }
}

export { KTable };
