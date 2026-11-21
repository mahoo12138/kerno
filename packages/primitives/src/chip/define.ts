import { define } from '@kerno/core';
import { KChip, KChipGroup } from './chip.js';

define('k-chip', KChip);
define('k-chip-group', KChipGroup);

declare global {
  interface HTMLElementTagNameMap {
    'k-chip': KChip;
    'k-chip-group': KChipGroup;
  }
}
