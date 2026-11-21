import { KernoElement, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { loadingOverlayStyles } from './loading-overlay.styles.js';

/**
 * Scoped container loading mask (`position: absolute; inset: 0`) that blocks
 * pointer interaction over a `position: relative` ancestor while displaying an
 * animated Fluent spinner and optional frosted Acrylic blur.
 *
 * @tag k-loading-overlay
 *
 * @slot - Optional custom loader replacing the default spinner.
 * @csspart inner - Centered loader stack.
 */
export class KLoadingOverlay extends KernoElement {
  static override styles = loadingOverlayStyles;
  static override template = /* html */ `<div part="inner" class="inner" role="status" aria-live="polite"><slot><span class="spinner-host" aria-hidden="true"></span></slot><span class="label"></span></div>`;

  @prop({ type: Boolean, reflect: true }) accessor visible = false;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = true;
  @prop({ reflect: true }) accessor label = '';

  #spinnerHost!: HTMLSpanElement;
  #labelEl!: HTMLSpanElement;

  protected override setup(): void {
    this.#spinnerHost = this.renderRoot.querySelector('.spinner-host') as HTMLSpanElement;
    this.#labelEl = this.renderRoot.querySelector('.label') as HTMLSpanElement;
    this.#spinnerHost.innerHTML = `<svg class="spinner" viewBox="0 0 16 16">${getIcon('loader') ?? ''}</svg>`;
  }

  protected override update(_changed: PropertyValues): void {
    this.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
    this.#labelEl.textContent = this.label;
  }
}
