import { define } from '@kerno/core';
import { KAccordion, KAccordionItem } from './accordion.js';

define('k-accordion', KAccordion);
define('k-accordion-item', KAccordionItem);

declare global {
  interface HTMLElementTagNameMap {
    'k-accordion': KAccordion;
    'k-accordion-item': KAccordionItem;
  }
}
