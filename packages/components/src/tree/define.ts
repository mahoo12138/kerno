import { define } from '@kerno/core';
import { KTree, KTreeItem } from './tree.js';

define('k-tree', KTree);
define('k-tree-item', KTreeItem);

declare global {
  interface HTMLElementTagNameMap {
    'k-tree': KTree;
    'k-tree-item': KTreeItem;
  }
}
