import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { formStyles } from './form.styles.js';

export type FormLayout = 'vertical' | 'horizontal' | 'grid';

export interface FormValidationError {
  name: string;
  label: string;
  message: string;
  element: HTMLElement;
}

export interface FormValidationResult {
  valid: boolean;
  errors: FormValidationError[];
  values: Record<string, unknown>;
}

export interface FormSubmitDetail {
  values: Record<string, unknown>;
  formData: FormData;
}

interface ValidatableControl extends HTMLElement {
  name?: string;
  value?: unknown;
  checked?: boolean;
  disabled?: boolean;
  isDisabled?: boolean;
  files?: readonly { file: File }[] | FileList | null;
  checkValidity?: () => boolean;
  validationMessage?: string;
  formResetCallback?: () => void;
  defaultValue?: string;
  defaultChecked?: boolean;
}

const NATIVE_CONTROL_SELECTOR = 'input, select, textarea';

function isFormControl(el: Element): el is ValidatableControl {
  if (!(el instanceof HTMLElement)) return false;
  if (el.matches(NATIVE_CONTROL_SELECTOR)) return true;
  const ctor = el.constructor as { formAssociated?: boolean };
  return Boolean(ctor?.formAssociated) && el.tagName.toLowerCase() !== 'k-button';
}

function resolveFieldLabel(el: HTMLElement): string {
  const field = el.closest('k-form-field');
  const fieldLabel = field?.getAttribute('label');
  if (fieldLabel) return fieldLabel;
  return el.getAttribute('aria-label') || el.getAttribute('name') || el.tagName.toLowerCase();
}

/**
 * Declarative form orchestrator coordinating native inputs and Kerno
 * `FormAssociatedElement` controls with structured value extraction,
 * validation error summary with click-to-focus, loading/disabled locking,
 * and `k-submit` / `k-invalid` / `k-reset` events.
 *
 * @tag k-form
 *
 * @slot - Form fields and controls (`<k-form-field>`, `<k-input>`, `<k-date-picker>`, etc.).
 * @slot actions - Optional action bar (`<k-button type="submit">`, `<k-button type="reset">`).
 *
 * @csspart base - Outer form layout wrapper.
 * @csspart summary - Validation error summary banner (`role="alert"`).
 * @csspart fields - Fields container.
 * @csspart actions - Trailing actions container.
 *
 * @fires k-submit - Fired when validation passes on submit (`{ values, formData }`).
 * @fires k-invalid - Fired when validation fails (`{ errors }`).
 * @fires k-reset - Fired when the form is reset.
 */
export class KForm extends KernoElement {
  static override styles = formStyles;
  static override template = /* html */ `<div part="base" class="base" role="form"><div part="summary" class="summary" role="alert" hidden><p class="summary-title"></p><ul class="summary-list"></ul></div><div part="fields" class="fields"><slot></slot></div><div part="actions" class="actions"><slot name="actions"></slot></div></div>`;

  @prop({ reflect: true }) accessor layout: FormLayout = 'vertical';
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;
  @prop({ type: Boolean, reflect: true }) accessor loading = false;
  @prop({ type: Boolean, reflect: true }) accessor novalidate = false;
  /** Displays an interactive top error summary when validation fails. */
  @prop({ type: Boolean, attribute: 'show-summary', reflect: true }) accessor showSummary = true;
  @prop({ reflect: true }) accessor label = '';

  #base!: HTMLDivElement;
  #summary!: HTMLDivElement;
  #summaryTitle!: HTMLParagraphElement;
  #summaryList!: HTMLUListElement;
  #actionsSlot!: HTMLSlotElement;

  #lockedControls = new WeakSet<HTMLElement>();

  /** Extracts all named control values into a structured object and `FormData`. */
  getValues(): { values: Record<string, unknown>; formData: FormData } {
    const values: Record<string, unknown> = {};
    const formData = new FormData();

    const appendValue = (name: string, val: unknown): void => {
      if (name in values) {
        const prev = values[name];
        values[name] = Array.isArray(prev) ? [...prev, val] : [prev, val];
      } else {
        values[name] = val;
      }
      if (val instanceof File) {
        formData.append(name, val);
      } else if (val !== null && val !== undefined) {
        formData.append(name, String(val));
      }
    };

    for (const ctrl of this.#controls()) {
      const name = ctrl.name || ctrl.getAttribute('name') || '';
      if (!name || ctrl.isDisabled || ctrl.disabled) continue;

      const tag = ctrl.tagName.toLowerCase();
      if (tag === 'k-radio' && ctrl.closest('k-radio-group')) continue;

      if (
        tag === 'k-checkbox' ||
        tag === 'k-switch' ||
        (ctrl instanceof HTMLInputElement && (ctrl.type === 'checkbox' || ctrl.type === 'radio'))
      ) {
        if (ctrl.checked) {
          appendValue(name, ctrl.value ?? 'on');
        }
        continue;
      }

      if (tag === 'k-upload' && Array.isArray(ctrl.files)) {
        const list = ctrl.files.map((entry: { file: File }) => entry.file);
        if (list.length > 0) {
          for (const f of list) appendValue(name, f);
        }
        continue;
      }

      if (ctrl.value !== null && ctrl.value !== undefined && ctrl.value !== '') {
        appendValue(name, ctrl.value);
      }
    }

    return { values, formData };
  }

  /** Validates every descendant form control and optionally renders the error summary. */
  validate(): FormValidationResult {
    const errors: FormValidationError[] = [];

    for (const ctrl of this.#controls()) {
      if (ctrl.isDisabled || ctrl.disabled) continue;
      if (ctrl.tagName.toLowerCase() === 'k-radio' && ctrl.closest('k-radio-group')) continue;

      if (typeof ctrl.checkValidity === 'function') {
        const ok = ctrl.checkValidity();
        if (!ok) {
          ctrl.toggleAttribute('data-user-invalid', true);
          ctrl.dispatchEvent(new Event('invalid', { bubbles: false, cancelable: true }));
          errors.push({
            name: ctrl.name || ctrl.getAttribute('name') || '',
            label: resolveFieldLabel(ctrl),
            message: ctrl.validationMessage || 'Invalid value',
            element: ctrl,
          });
        }
      }
    }

    this.#renderSummary(errors);
    const { values } = this.getValues();
    return { valid: errors.length === 0, errors, values };
  }

  /** Runs validation (unless `novalidate`) and emits `k-submit` or `k-invalid`. */
  submit(): boolean {
    if (this.disabled || this.loading) return false;
    if (!this.novalidate) {
      const result = this.validate();
      if (!result.valid) {
        emit(this, 'k-invalid', { errors: result.errors });
        result.errors[0]?.element.focus();
        return false;
      }
    } else {
      this.#renderSummary([]);
    }
    const { values, formData } = this.getValues();
    emit<FormSubmitDetail>(this, 'k-submit', { values, formData }, { cancelable: true });
    return true;
  }

  /** Resets all descendant controls to their initial values and clears errors. */
  reset(): void {
    for (const ctrl of this.#controls()) {
      if (typeof ctrl.formResetCallback === 'function') {
        ctrl.formResetCallback();
      } else if (ctrl instanceof HTMLInputElement) {
        if (ctrl.type === 'checkbox' || ctrl.type === 'radio') {
          ctrl.checked = ctrl.defaultChecked;
        } else {
          ctrl.value = ctrl.defaultValue;
        }
      } else if (ctrl instanceof HTMLTextAreaElement) {
        ctrl.value = ctrl.defaultValue;
      } else if (ctrl instanceof HTMLSelectElement) {
        for (const opt of ctrl.options) {
          opt.selected = opt.defaultSelected;
        }
      }
      ctrl.removeAttribute('data-user-invalid');
    }
    this.#renderSummary([]);
    emit(this, 'k-reset');
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#summary = this.renderRoot.querySelector('.summary') as HTMLDivElement;
    this.#summaryTitle = this.renderRoot.querySelector('.summary-title') as HTMLParagraphElement;
    this.#summaryList = this.renderRoot.querySelector('.summary-list') as HTMLUListElement;
    this.#actionsSlot = this.renderRoot.querySelector('slot[name="actions"]') as HTMLSlotElement;

    const syncActions = (): void => {
      this.#actionsSlot.parentElement?.classList.toggle(
        'has-content',
        this.#actionsSlot.assignedNodes().length > 0,
      );
    };
    this.#actionsSlot.addEventListener('slotchange', syncActions);
    syncActions();

    this.addEventListener('click', (event) => {
      const path = event.composedPath();
      for (const node of path) {
        if (node === this) break;
        if (!(node instanceof HTMLElement)) continue;
        const tag = node.tagName.toLowerCase();
        if (tag === 'k-button' || tag === 'button') {
          const type = node.getAttribute('type') || (tag === 'button' ? 'submit' : 'button');
          if (type === 'submit') {
            event.preventDefault();
            this.submit();
            return;
          }
          if (type === 'reset') {
            event.preventDefault();
            this.reset();
            return;
          }
        }
      }
    });

    this.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      if (tag === 'k-input' || (target instanceof HTMLInputElement && target.type !== 'button')) {
        event.preventDefault();
        this.submit();
      }
    });
  }

  protected override update(changed: PropertyValues): void {
    if (this.label) this.#base.setAttribute('aria-label', this.label);
    else this.#base.removeAttribute('aria-label');

    if (changed.has('disabled') || changed.has('loading')) {
      this.#syncDisabledState();
    }
  }

  #controls(): ValidatableControl[] {
    const out: ValidatableControl[] = [];
    for (const el of this.querySelectorAll('*')) {
      if (isFormControl(el)) out.push(el);
    }
    return out;
  }

  #syncDisabledState(): void {
    const lock = this.disabled || this.loading;
    for (const ctrl of this.#controls()) {
      if (lock) {
        if (!ctrl.disabled) {
          this.#lockedControls.add(ctrl);
          ctrl.disabled = true;
        }
      } else if (this.#lockedControls.has(ctrl)) {
        this.#lockedControls.delete(ctrl);
        ctrl.disabled = false;
      }
    }

    for (const btn of this.querySelectorAll<
      HTMLElement & { loading?: boolean; disabled?: boolean }
    >('k-button[type="submit"]')) {
      btn.loading = this.loading;
      if (this.disabled && !btn.disabled) {
        this.#lockedControls.add(btn);
        btn.disabled = true;
      } else if (!this.disabled && this.#lockedControls.has(btn)) {
        this.#lockedControls.delete(btn);
        btn.disabled = false;
      }
    }
  }

  #renderSummary(errors: FormValidationError[]): void {
    if (!this.showSummary || errors.length === 0) {
      this.#summary.hidden = true;
      this.#summaryList.innerHTML = '';
      return;
    }

    this.#summary.hidden = false;
    this.#summaryTitle.textContent =
      errors.length === 1
        ? 'Please fix 1 validation error:'
        : `Please fix ${errors.length} validation errors:`;

    const frag = document.createDocumentFragment();
    for (const err of errors) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'summary-btn';
      btn.textContent = `${err.label}: ${err.message}`;
      btn.addEventListener('click', () => {
        err.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        err.element.focus();
      });
      li.append(btn);
      frag.append(li);
    }
    this.#summaryList.replaceChildren(frag);
  }
}
