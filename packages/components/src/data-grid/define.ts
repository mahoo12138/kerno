import { define } from '@kerno/core';
import { KDataGrid } from './data-grid.js';

define('k-data-grid', KDataGrid);

declare global {
  interface HTMLElementTagNameMap {
    'k-data-grid': KDataGrid;
  }
}
