import { prop, state } from './decorators.js';
import { KernoElement } from './element.js';
import { LocalizeController } from './i18n.js';

/** Input types that block implicit submission when a form has no submit button (HTML spec). */
const BLOCKING_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'date',
  'month',
  'week',
  'time',
  'datetime-local',
  'number',
]);

function isSubmitButton(el: Element): el is HTMLElement {
  if (el instanceof HTMLButtonElement) return el.type === 'submit';
  if (el instanceof HTMLInputElement) return el.type === 'submit' || el.type === 'image';
  const ctor = el.constructor as { formAssociated?: boolean };
  return ctor.formAssociated === true && (el as Element & { type?: unknown }).type === 'submit';
}

function isDisabledSubmitButton(el: HTMLElement): boolean {
  const maybe = el as HTMLElement & { isDisabled?: boolean; disabled?: boolean };
  return Boolean(maybe.isDisabled) || Boolean(maybe.disabled) || el.matches(':disabled');
}

function blocksImplicitSubmission(el: Element): boolean {
  if (el instanceof HTMLInputElement) return BLOCKING_INPUT_TYPES.has(el.type);
  const ctor = el.constructor as { blocksImplicitSubmission?: boolean };
  return ctor.blocksImplicitSubmission === true;
}

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

  /**
   * Whether the control counts as a "field that blocks implicit submission",
   * like a native text `<input>`: a form without a submit button is only
   * submitted by Enter when it has at most one such field.
   */
  static readonly blocksImplicitSubmission: boolean = false;

  @prop({ reflect: true }) accessor name = '';
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;
  @prop({ type: Boolean, reflect: true }) accessor required = false;

  /** Disabled through an ancestor `<fieldset disabled>` (or own attribute). */
  @state() protected accessor formDisabled = false;

  #interacted = false;

  /** Localized messages in the control's language (see `LocalizeController`). */
  protected readonly localize = new LocalizeController(this);

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
      this.internals.setValidity(flags, message || this.localize.term('invalidValue'), anchor);
    } else {
      this.internals.setValidity({});
    }
    if (this.#interacted || !hasError) {
      this.toggleAttribute('data-user-invalid', hasError);
    }
  }

  /**
   * Runs HTML implicit submission for the owning form — what pressing Enter in
   * a native text field does. Activates the form's default (first) submit
   * button unless it is disabled; without one, submits the form only when it
   * has at most one field that blocks implicit submission.
   *
   * The browser never submits a form on Enter from an `<input>` inside a shadow
   * root, so text-entry controls call this from their Enter handler.
   */
  protected submitImplicitly(): void {
    const form = this.form;
    if (!form) return;
    let blockingFields = 0;
    for (const el of form.elements) {
      if (isSubmitButton(el)) {
        if (!isDisabledSubmitButton(el)) el.click();
        return;
      }
      if (blocksImplicitSubmission(el)) blockingFields++;
    }
    if (blockingFields <= 1) form.requestSubmit();
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
