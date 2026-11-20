import { define } from '@kerno/core';
import { KBreadcrumb, KBreadcrumbItem } from './breadcrumb.js';

define('k-breadcrumb', KBreadcrumb);
define('k-breadcrumb-item', KBreadcrumbItem);

declare global {
  interface HTMLElementTagNameMap {
    'k-breadcrumb': KBreadcrumb;
    'k-breadcrumb-item': KBreadcrumbItem;
  }
}
