import { define } from '@kerno/core';
import { KScrollbar, KScrollView } from './scrollbar.js';

define('k-scroll-view', KScrollView);
define('k-scrollbar', KScrollbar);

declare global {
  interface HTMLElementTagNameMap {
    'k-scroll-view': KScrollView;
    'k-scrollbar': KScrollbar;
  }
}
