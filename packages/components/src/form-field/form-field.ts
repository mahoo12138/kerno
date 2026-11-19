import { FormAssociatedElement, KernoElement, prop, type PropertyValues } from '@kerno/core';
import { formFieldStyles } from './form-field.styles.js';

/**
 * Form field layout wrapper coordinating label association, required indicator,
 * help text and automatic live validation error display for a child form control.
 *
 * @tag k-form-field
 *
 * @slot - Form control (`<k-input>`, `<k-select>`, `<k-checkbox>`, etc.).
 *
 * @csspart label - Field label.
 * @csspart control - Control wrapper.
 * @csspart help - Help text element.
 * @csspart error - Error message element (`role="alert"`).
 */
export class KFormField extends KernoElement {
  static override styles = formFieldStyles;
  static override template = /* html */ `<label part="label" class="label"><span class="label-text"></span><span class="required-mark" hidden>*</span></label><div part="control" class="control"><slot></slot></div><div part="help" class="help"></div><div part="error" class="error" role="alert"></div>`;

  @prop({ reflect: true }) accessor label = '';
  @prop({ reflect: true }) accessor help = '';
  @prop({ reflect: true }) accessor error = '';
  @prop({ type: Boolean, reflect: true }) accessor required = false;

  #labelEl!: HTMLLabelElement;
  #labelText!: HTMLSpanElement;
  #requiredMark!: HTMLSpanElement;
  #helpEl!: HTMLDivElement;
  #errorEl!: HTMLDivElement;
  #slot!: HTMLSlotElement;
  #autoError = '';

  constructor() {
    super();
    this.addEventListener('invalid', this.#onControlValidationEvent, true);
    this.addEventListener('input', this.#onControlValidationEvent);
    this.addEventListener('change', this.#onControlValidationEvent);
  }

  protected override setup(): void {
    this.#labelEl = this.renderRoot.querySelector('.label') as HTMLLabelElement;
    this.#labelText = this.renderRoot.querySelector('.label-text') as HTMLSpanElement;
    this.#requiredMark = this.renderRoot.querySelector('.required-mark') as HTMLSpanElement;
    this.#helpEl = this.renderRoot.querySelector('.help') as HTMLDivElement;
    this.#errorEl = this.renderRoot.querySelector('.error') as HTMLDivElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;

    this.#labelEl.addEventListener('click', () => {
      this.#getControl()?.focus();
    });

    this.#slot.addEventListener('slotchange', () => {
      this.#syncControl();
      this.requestUpdate();
    });
  }

  protected override willUpdate(_changed: PropertyValues): void {
    this.#syncControl();
  }

  protected override update(_changed: PropertyValues): void {
    this.#labelText.textContent = this.label;
    const control = this.#getControl();
    const isRequired = this.required || Boolean(control?.required);
    this.#requiredMark.hidden = !this.label || !isRequired;
    this.#helpEl.textContent = this.help;
    this.#errorEl.textContent = this.error || this.#autoError;
  }

  #getControl():
    | (HTMLElement & {
        required?: boolean;
        validationMessage?: string;
        validity?: ValidityState;
      })
    | null {
    const el = this.#slot?.assignedElements({ flatten: true })[0];
    return (el as HTMLElement) ?? null;
  }

  #syncControl(): void {
    const control = this.#getControl();
    if (control && this.required) {
      control.setAttribute('required', '');
      if ('required' in control) control.required = true;
    }
  }

  #onControlValidationEvent = (event: Event): void => {
    const control = this.#getControl();
    if (!control) return;
    const isInvalid =
      event.type === 'invalid' ||
      (control instanceof FormAssociatedElement
        ? control.hasAttribute('data-user-invalid')
        : Boolean(control.validity && !control.validity.valid));
    this.#autoError = isInvalid ? control.validationMessage || 'Invalid value' : '';
    this.#errorEl.textContent = this.error || this.#autoError;
  };
}
