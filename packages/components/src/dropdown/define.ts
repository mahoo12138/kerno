import { define } from '@kerno/core';
import { KDropdown, KMenu, KMenuItem } from './dropdown.js';

define('k-menu-item', KMenuItem);
define('k-menu', KMenu);
define('k-dropdown', KDropdown);

declare global {
  interface HTMLElementTagNameMap {
    'k-menu-item': KMenuItem;
    'k-menu': KMenu;
    'k-dropdown': KDropdown;
  }
}

export { KMenuItem, KMenu, KDropdown };
