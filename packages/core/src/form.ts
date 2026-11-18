import { prop, state } from './decorators.js';
import { KernoElement } from './element.js';

/**
 * Base for form-associated controls, built on `ElementInternals`.
 *
 * Provides `name`, `disabled` (merged with ancestor `<fieldset disabled>`),
 * `required`, user-invalid state tracking (`data-user-invalid`), and
 * native-like validity accessors. Subclasses push their value with
 * `this.setFormValue()` and handle `formResetCallback()`.
 */
export abstract class FormAssociatedElement extends KernoElement {
  static readonly formAssociated = true;

  @prop({ reflect: true }) accessor name = '';
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;
  @prop({ type: Boolean, reflect: true }) accessor required = false;

  /** Disabled through an ancestor `<fieldset disabled>` (or own attribute). */
  @state() protected accessor formDisabled = false;

  #interacted = false;

  constructor() {
    super();
    this.addEventListener('invalid', () => {
      this.toggleAttribute('data-user-invalid', true);
    });
  }

  /** Effective disabled state: own attribute or an ancestor fieldset. */
  get isDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  get labels(): NodeList {
    return this.internals.labels;
  }

  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    const valid = this.internals.reportValidity();
    this.toggleAttribute('data-user-invalid', !valid);
    return valid;
  }

  /** Marks that the user has edited/interacted with the control and refreshes `data-user-invalid`. */
  protected markInteracted(): void {
    this.#interacted = true;
    this.toggleAttribute('data-user-invalid', !this.internals.validity.valid);
  }

  /** Sets the element's form submission value via `ElementInternals`. */
  protected setFormValue(
    value: File | string | FormData | null,
    state?: File | string | FormData | null,
  ): void {
    this.internals.setFormValue(value, state);
  }

  /** Updates the element's validity state via `ElementInternals` and syncs `data-user-invalid`. */
  protected setValidity(
    flags: ValidityStateFlags = {},
    message?: string,
    anchor?: HTMLElement,
  ): void {
    const hasError = Object.values(flags).some(Boolean);
    if (hasError) {
      this.internals.setValidity(flags, message || 'Invalid value', anchor);
    } else {
      this.internals.setValidity({});
    }
    if (this.#interacted || !hasError) {
      this.toggleAttribute('data-user-invalid', hasError);
    }
  }

  /** Called by the browser when the disabled state of an ancestor fieldset changes. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  formResetCallback(): void {
    this.#interacted = false;
    this.removeAttribute('data-user-invalid');
  }
}
