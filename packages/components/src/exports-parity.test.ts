import { describe, expect, it } from 'vitest';
import '@kerno/effects/define';
import '@kerno/primitives/define';
import './define.js';

const EXPECTED_CUSTOM_ELEMENTS = [
  // @kerno/effects
  'k-surface',
  // @kerno/primitives (19 modules)
  'k-button',
  'k-icon',
  'k-input',
  'k-checkbox',
  'k-radio',
  'k-radio-group',
  'k-switch',
  'k-badge',
  'k-separator',
  'k-select',
  'k-option',
  'k-slider',
  'k-avatar',
  'k-avatar-group',
  'k-textarea',
  'k-number-input',
  'k-pin-input',
  'k-rating',
  'k-kbd',
  'k-indicator',
  'k-chip',
  'k-chip-group',
  'k-range-slider',
  // @kerno/components (41 modules)
  'k-dialog',
  'k-popover',
  'k-tooltip',
  'k-dropdown',
  'k-menu',
  'k-menu-item',
  'k-tabs',
  'k-tab',
  'k-tab-panel',
  'k-nav',
  'k-nav-item',
  'k-card',
  'k-progress',
  'k-skeleton',
  'k-empty-state',
  'k-table',
  'k-form-field',
  'k-scrollbar',
  'k-scroll-view',
  'k-tile',
  'k-tile-group',
  'k-tile-bound',
  'k-alert',
  'k-toast',
  'k-toast-container',
  'k-drawer',
  'k-command',
  'k-command-group',
  'k-command-item',
  'k-accordion',
  'k-accordion-item',
  'k-breadcrumb',
  'k-breadcrumb-item',
  'k-pagination',
  'k-autocomplete',
  'k-date-picker',
  'k-upload',
  'k-tree',
  'k-tree-item',
  'k-list',
  'k-list-item',
  'k-time-picker',
  'k-cascader',
  'k-form',
  'k-data-grid',
  'k-segmented-control',
  'k-tags-input',
  'k-multi-select',
  'k-stepper',
  'k-stepper-step',
  'k-timeline',
  'k-timeline-item',
  'k-ring-progress',
  'k-color-picker',
  'k-color-input',
  'k-hover-card',
  'k-loading-overlay',
  'k-spoiler',
  'k-copy-button',
] as const;

describe('Kerno custom element registry parity', () => {
  it('registers every public k-* custom element cleanly and idempotently', () => {
    for (const tag of EXPECTED_CUSTOM_ELEMENTS) {
      const ctor = customElements.get(tag);
      expect(ctor, `Expected <${tag}> to be defined`).toBeDefined();
      const instance = document.createElement(tag);
      expect(instance).toBeInstanceOf(ctor!);
    }
  });
});
