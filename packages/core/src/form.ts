import { prop, state } from './decorators.js';
import { KernoElement } from './element.js';

/**
 * Base for form-associated controls, built on `ElementInternals`.
 *
 * Provides `name`, `disabled` (merged with ancestor `<fieldset disabled>`),
 * and native-like validity accessors. Subclasses push their value with
 * `this.internals.setFormValue()` and handle `formResetCallback()`.
 */
export abstract class FormAssociatedElement extends KernoElement {
  static readonly formAssociated = true;

  @prop({ reflect: true }) accessor name = '';
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  /** Disabled through an ancestor `<fieldset disabled>` (or own attribute). */
  @state() protected accessor formDisabled = false;

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
    return this.internals.reportValidity();
  }

  /** Called by the browser when the disabled state of an ancestor fieldset changes. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  formResetCallback(): void {}
}
