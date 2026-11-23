import {
  AriaForwardingController,
  FormAssociatedElement,
  prop,
  type PropertyValues,
} from '@kerno/core';
import { sliderStyles } from './slider.styles.js';

/**
 * Form-associated Fluent range slider with active track fill, tabular value
 * readout and full keyboard support.
 *
 * @tag k-slider
 *
 * @csspart header - Optional label + value row.
 * @csspart label - Label text.
 * @csspart value - Formatted numeric readout.
 * @csspart input - Native `<input type="range">`.
 *
 * @fires input - Fired continuously while dragging or adjusting via keyboard.
 * @fires change - Fired when adjustment is committed.
 */
export class KSlider extends FormAssociatedElement {
  static override styles = sliderStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="header" class="header"><span part="label" class="label"></span><span part="value" class="value"></span></div><input part="input" class="range" type="range" />`;

  @prop({ type: Number, reflect: true }) accessor value = 50;
  @prop({ type: Number, reflect: true }) accessor min = 0;
  @prop({ type: Number, reflect: true }) accessor max = 100;
  @prop({ type: Number, reflect: true }) accessor step = 1;
  @prop({ reflect: true }) accessor label = '';
  @prop({ reflect: true }) accessor unit = '';
  @prop({ type: Boolean, attribute: 'show-value', reflect: true }) accessor showValue = false;

  #header!: HTMLDivElement;
  #labelEl!: HTMLSpanElement;
  #valueEl!: HTMLSpanElement;
  #input!: HTMLInputElement;
  #defaultValue = 50;
  #defaultCaptured = false;

  constructor() {
    super();
    // Forward host aria-label / aria-labelledby / <label for> to the focused inner element.
    new AriaForwardingController(this, {
      getTarget: () => this.#input,
      getFallbackLabel: () => this.label,
    });
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      const attr = this.getAttribute('value');
      this.#defaultValue = attr !== null ? Number(attr) : this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
  }

  protected override setup(): void {
    this.#header = this.renderRoot.querySelector('.header') as HTMLDivElement;
    this.#labelEl = this.renderRoot.querySelector('.label') as HTMLSpanElement;
    this.#valueEl = this.renderRoot.querySelector('.value') as HTMLSpanElement;
    this.#input = this.renderRoot.querySelector('.range') as HTMLInputElement;

    this.#input.addEventListener('input', () => {
      this.value = Number(this.#input.value);
      this.markInteracted();
      this.#syncVisuals();
      this.setFormValue(String(this.value));
    });

    this.#input.addEventListener('change', () => {
      this.value = Number(this.#input.value);
      this.markInteracted();
      this.#syncVisuals();
      this.setFormValue(String(this.value));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
  }

  protected override update(_changed: PropertyValues): void {
    this.#input.min = String(this.min);
    this.#input.max = String(this.max);
    this.#input.step = String(this.step);
    this.#input.disabled = this.isDisabled;

    const clamped = this.#clamp(this.value);
    if (this.#input.value !== String(clamped)) {
      this.#input.value = String(clamped);
    }

    this.#syncVisuals();
    this.setFormValue(String(clamped));
  }

  #clamp(val: number): number {
    if (!Number.isFinite(val)) return this.min;
    return Math.min(this.max, Math.max(this.min, val));
  }

  #syncVisuals(): void {
    const val = this.#clamp(this.value);
    const span = this.max - this.min;
    const pct = span > 0 ? ((val - this.min) / span) * 100 : 0;
    this.style.setProperty('--_percent', `${pct.toFixed(2)}%`);

    const showHeader = this.label.length > 0 || this.showValue;
    this.#header.classList.toggle('visible', showHeader);
    this.#labelEl.textContent = this.label;
    this.#valueEl.textContent = this.showValue ? `${val}${this.unit}` : '';
  }
}
