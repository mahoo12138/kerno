import { KernoElement, prop } from '@kerno/core';
import { kbdStyles } from './kbd.styles.js';

export type KbdSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Semantic keyboard keycap display (`<k-kbd>⌘</k-kbd> + <k-kbd>K</k-kbd>`).
 *
 * @tag k-kbd
 *
 * @slot - Key symbol or label.
 * @csspart key - Inner `<kbd>` element.
 */
export class KKbd extends KernoElement {
  static override styles = kbdStyles;
  static override template = /* html */ `<kbd part="key"><slot></slot></kbd>`;

  @prop({ reflect: true }) accessor size: KbdSize = 'sm';
}
