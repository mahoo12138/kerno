import { KernoElement, prop, type PropertyValues } from '@kerno/core';
import { skeletonStyles } from './skeleton.styles.js';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';
export type SkeletonEffect = 'pulse' | 'none';

/**
 * Loading placeholder skeleton.
 *
 * @tag k-skeleton
 *
 * @csspart base - Skeleton block.
 */
export class KSkeleton extends KernoElement {
  static override styles = skeletonStyles;
  static override template = /* html */ `<div part="base" class="base" aria-hidden="true"></div>`;

  @prop({ reflect: true }) accessor variant: SkeletonVariant = 'text';
  @prop({ reflect: true }) accessor effect: SkeletonEffect = 'pulse';
  @prop({ reflect: true }) accessor width = '';
  @prop({ reflect: true }) accessor height = '';

  protected override update(_changed: PropertyValues): void {
    this.setAttribute('aria-busy', 'true');
    if (this.width) this.style.width = this.width;
    else this.style.removeProperty('width');
    if (this.height) this.style.height = this.height;
    else this.style.removeProperty('height');
  }
}
