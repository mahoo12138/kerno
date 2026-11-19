import { KernoElement, prop, type PropertyValues } from '@kerno/core';
import { separatorStyles } from './separator.styles.js';

export type SeparatorOrientation = 'horizontal' | 'vertical';

/**
 * Visual and semantic divider (`role="separator"`).
 *
 * @tag k-separator
 */
export class KSeparator extends KernoElement {
  static override styles = separatorStyles;

  @prop({ reflect: true }) accessor orientation: SeparatorOrientation = 'horizontal';
  @prop({ type: Boolean, reflect: true }) accessor decorative = false;

  protected override update(_changed: PropertyValues): void {
    if (this.decorative) {
      this.setAttribute('role', 'none');
      this.removeAttribute('aria-orientation');
    } else {
      this.setAttribute('role', 'separator');
      this.setAttribute('aria-orientation', this.orientation);
    }
  }
}
