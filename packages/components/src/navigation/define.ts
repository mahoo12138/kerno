import { define } from '@kerno/core';
import { KNav, KNavItem } from './navigation.js';

define('k-nav', KNav);
define('k-nav-item', KNavItem);

declare global {
  interface HTMLElementTagNameMap {
    'k-nav-item': KNavItem;
    'k-nav': KNav;
  }
}

export { KNavItem, KNav };
