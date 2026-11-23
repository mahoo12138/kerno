import {
  AriaForwardingController,
  FormAssociatedElement,
  prop,
  type PropertyValues,
} from '@kerno/core';
import type { CornerKind } from '@kerno/effects/shape';
import { LazyShapeOutlineController } from '@kerno/effects/shape/lazy';
import { textareaStyles } from './textarea.styles.js';

export type TextareaSize = 'sm' | 'md' | 'lg';
export type TextareaResize = 'vertical' | 'none' | 'both' | 'horizontal';

/**
 * Form-associated multi-line text area with optional `auto-resize`, live
 * character counter (`show-count`), native constraint validation, and
 * parametric `shape` support.
 *
 * @tag k-textarea
 *
 * @csspart base - Outer bordered wrapper.
 * @csspart textarea - Native `<textarea>`.
 * @csspart count - Live character counter readout.
 *
 * @fires input - Native composed `input` event when value changes.
 * @fires change - Composed `change` event when value is committed.
 */
export class KTextarea extends FormAssociatedElement {
  static override styles = textareaStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="base" class="base"><textarea part="textarea" class="textarea"></textarea></div><div class="footer" hidden><span part="count" class="count"></span></div>`;

  @prop() accessor value = '';
  @prop({ reflect: true }) accessor placeholder = '';
  @prop({ type: Number, reflect: true }) accessor rows = 3;
  @prop({ reflect: true }) accessor size: TextareaSize = 'md';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ reflect: true }) accessor resize: TextareaResize = 'vertical';
  @prop({ type: Boolean, attribute: 'auto-resize', reflect: true }) accessor autoResize = false;
  @prop({ type: Boolean, attribute: 'show-count', reflect: true }) accessor showCount = false;
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ type: Number, attribute: 'minlength' }) accessor minLength: number | null = null;
  @prop({ type: Number, attribute: 'maxlength' }) accessor maxLength: number | null = null;

  #base!: HTMLDivElement;
  #textarea!: HTMLTextAreaElement;
  #footer!: HTMLDivElement;
  #countEl!: HTMLSpanElement;
  #defaultValue = '';
  #defaultCaptured = false;

  readonly #shapeOutline = new LazyShapeOutlineController(this, {
    getTarget: () => this.#base ?? null,
    getKind: () => this.shape,
  });

  constructor() {
    super();
    // Forward host aria-label / aria-labelledby / <label for> to the focused inner element.
    new AriaForwardingController(this, { getTarget: () => this.#textarea });
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.getAttribute('value') ?? this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    if (this.#textarea) {
      this.#textarea.value = this.#defaultValue;
      this.#syncAutoResize();
      this.#syncFormAndValidity();
      this.#syncCount();
    }
  }

  select(): void {
    this.#textarea?.select();
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#textarea = this.renderRoot.querySelector('.textarea') as HTMLTextAreaElement;
    this.#footer = this.renderRoot.querySelector('.footer') as HTMLDivElement;
    this.#countEl = this.renderRoot.querySelector('.count') as HTMLSpanElement;

    this.#textarea.addEventListener('input', () => {
      this.value = this.#textarea.value;
      this.markInteracted();
      this.#syncAutoResize();
      this.#syncFormAndValidity();
      this.#syncCount();
    });

    this.#textarea.addEventListener('change', () => {
      this.value = this.#textarea.value;
      this.markInteracted();
      this.#syncFormAndValidity();
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
  }

  protected override update(changed: PropertyValues): void {
    const disabled = this.isDisabled;
    this.#base.classList.toggle('disabled', disabled);
    this.#textarea.disabled = disabled;
    this.#textarea.readOnly = this.readonly;
    this.#textarea.required = this.required;
    this.#textarea.placeholder = this.placeholder;
    this.#textarea.rows = Math.max(1, Math.floor(this.rows) || 3);

    if (this.minLength !== null && this.minLength >= 0) this.#textarea.minLength = this.minLength;
    else this.#textarea.removeAttribute('minlength');

    if (this.maxLength !== null && this.maxLength >= 0) this.#textarea.maxLength = this.maxLength;
    else this.#textarea.removeAttribute('maxlength');

    if (this.#textarea.value !== this.value) {
      this.#textarea.value = this.value;
    }

    this.#syncAutoResize();
    this.#syncCount();
    this.#syncFormAndValidity();

    if (
      changed.has('shape') ||
      changed.has('size') ||
      changed.has('rows') ||
      changed.has('autoResize') ||
      changed.has('value')
    ) {
      this.#shapeOutline.sync();
    }
  }

  #syncAutoResize(): void {
    if (!this.autoResize) {
      this.#textarea.style.height = '';
      return;
    }
    this.#textarea.style.height = 'auto';
    if (this.#textarea.scrollHeight > 0) {
      this.#textarea.style.height = `${this.#textarea.scrollHeight}px`;
    }
  }

  #syncCount(): void {
    if (!this.showCount) {
      this.#footer.hidden = true;
      return;
    }
    this.#footer.hidden = false;
    const len = this.value.length;
    if (this.maxLength !== null && this.maxLength > 0) {
      const max = String(this.maxLength);
      this.#countEl.textContent = this.localize.term('characterCount', String(len), max);
      this.#countEl.classList.toggle('limit', len >= this.maxLength);
    } else {
      this.#countEl.textContent = `${len}`;
      this.#countEl.classList.remove('limit');
    }
  }

  #syncFormAndValidity(): void {
    this.setFormValue(this.isDisabled ? null : this.value);
    if (this.isDisabled || this.readonly) {
      this.setValidity({});
      return;
    }
    const v = this.#textarea.validity;
    const flags: ValidityStateFlags = {
      valueMissing: v.valueMissing,
      tooShort: v.tooShort,
      tooLong: v.tooLong,
    };
    this.setValidity(flags, this.#textarea.validationMessage, this.#textarea);
  }
}
