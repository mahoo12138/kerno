import { define } from '@kerno/core';
import { KTab, KTabPanel, KTabs } from './tabs.js';

define('k-tabs', KTabs);
define('k-tab', KTab);
define('k-tab-panel', KTabPanel);

declare global {
  interface HTMLElementTagNameMap {
    'k-tab': KTab;
    'k-tab-panel': KTabPanel;
    'k-tabs': KTabs;
  }
}

export { KTab, KTabPanel, KTabs };
