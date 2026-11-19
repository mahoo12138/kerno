import { KernoElement, prop } from '@kerno/core';
import { badgeStyles } from './badge.styles.js';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

/**
 * Status or counter badge primitive.
 *
 * @tag k-badge
 *
 * @slot - Badge label.
 *
 * @csspart base - Badge wrapper.
 */
export class KBadge extends KernoElement {
  static override styles = badgeStyles;
  static override template = /* html */ `<span part="base" class="base"><slot></slot></span>`;

  @prop({ reflect: true }) accessor variant: BadgeVariant = 'neutral';
  @prop({ type: Boolean, reflect: true }) accessor pill = false;
}
