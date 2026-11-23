import { KernoElement, LocalizeController, prop, type PropertyValues } from '@kerno/core';
import { progressStyles } from './progress.styles.js';

export type ProgressVariant = 'accent' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

/**
 * Accessible progress indicator (`role="progressbar"`).
 *
 * @tag k-progress
 *
 * @csspart track - Outer progress track.
 * @csspart bar - Filled indicator bar.
 */
export class KProgress extends KernoElement {
  static override styles = progressStyles;
  static override template = /* html */ `<div part="track" class="track" role="progressbar" aria-valuemin="0"><div part="bar" class="bar"></div></div>`;
  readonly #localize = new LocalizeController(this);

  @prop({ type: Number, reflect: true }) accessor value = 0;
  @prop({ type: Number, reflect: true }) accessor max = 100;
  @prop({ type: Boolean, reflect: true }) accessor indeterminate = false;
  @prop({ reflect: true }) accessor variant: ProgressVariant = 'accent';
  @prop({ reflect: true }) accessor size: ProgressSize = 'md';
  @prop({ reflect: true }) accessor label = '';

  #track!: HTMLDivElement;
  #bar!: HTMLDivElement;

  get percentage(): number {
    const safeMax = this.max > 0 ? this.max : 100;
    const clamped = Math.max(0, Math.min(safeMax, this.value));
    return Math.round((clamped / safeMax) * 100);
  }

  protected override setup(): void {
    this.#track = this.renderRoot.querySelector('.track') as HTMLDivElement;
    this.#bar = this.renderRoot.querySelector('.bar') as HTMLDivElement;
  }

  protected override update(_changed: PropertyValues): void {
    const safeMax = this.max > 0 ? this.max : 100;
    const clamped = Math.max(0, Math.min(safeMax, this.value));
    this.#track.setAttribute('aria-label', this.label || this.#localize.term('progress'));
    this.#track.setAttribute('aria-valuemax', String(safeMax));

    if (this.indeterminate) {
      this.#track.removeAttribute('aria-valuenow');
    } else {
      this.#track.setAttribute('aria-valuenow', String(clamped));
      this.#bar.style.width = `${this.percentage}%`;
    }
  }
}
