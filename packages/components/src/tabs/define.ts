import { define } from '@kerno/core';
import { KTab, KTabPanel, KTabs } from './tabs.js';

define('k-tab', KTab);
define('k-tab-panel', KTabPanel);
define('k-tabs', KTabs);

declare global {
  interface HTMLElementTagNameMap {
    'k-tab': KTab;
    'k-tab-panel': KTabPanel;
    'k-tabs': KTabs;
  }
}

export { KTab, KTabPanel, KTabs };
