import { KernoElement, prop, type PropertyValues } from '@kerno/core';
import { indicatorStyles } from './indicator.styles.js';

export type IndicatorPosition =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'middle-start'
  | 'middle-center'
  | 'middle-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';

export type IndicatorVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Corner notification dot or counter badge anchored over any slotted element,
 * with 9-point placement, optional cutout border, and `processing` pulse wave.
 *
 * @tag k-indicator
 *
 * @slot - Target element (e.g. `<k-avatar>`, `<k-button>`, `<k-icon>`).
 * @csspart badge - Floating indicator dot or counter pill.
 */
export class KIndicator extends KernoElement {
  static override styles = indicatorStyles;
  static override template = /* html */ `<slot></slot><span part="badge" class="badge" aria-live="polite"></span>`;

  @prop({ reflect: true }) accessor label = '';
  @prop({ reflect: true }) accessor position: IndicatorPosition = 'top-end';
  @prop({ reflect: true }) accessor variant: IndicatorVariant = 'accent';
  @prop({ type: Number, reflect: true }) accessor size = 10;
  @prop({ type: Number, reflect: true }) accessor offset = 0;
  @prop({ type: Boolean, reflect: true }) accessor processing = false;
  @prop({ type: Boolean, attribute: 'with-border', reflect: true }) accessor withBorder = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  #badge!: HTMLSpanElement;

  protected override setup(): void {
    this.#badge = this.renderRoot.querySelector('.badge') as HTMLSpanElement;
  }

  protected override update(_changed: PropertyValues): void {
    const text = this.label.trim();
    this.#badge.textContent = text;
    this.#badge.classList.toggle('has-label', text.length > 0);
    this.#badge.setAttribute('aria-hidden', text ? 'false' : 'true');

    if (Number.isFinite(this.size) && this.size > 0) {
      this.style.setProperty('--k-indicator-size', `${this.size}px`);
    }
    if (Number.isFinite(this.offset)) {
      this.style.setProperty('--k-indicator-offset', `${this.offset}px`);
    }
  }
}
