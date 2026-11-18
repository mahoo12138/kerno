import { FormAssociatedElement, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '../icon/registry.js';
import { checkboxStyles } from './checkbox.styles.js';

export type CheckboxSize = 'sm' | 'md' | 'lg';

/**
 * Form-associated checkbox supporting `checked`, `indeterminate`, constraint
 * validation and full keyboard operation.
 *
 * @tag k-checkbox
 *
 * @slot - Checkbox label text.
 *
 * @csspart base - Outer interactive wrapper.
 * @csspart control - Focusable checkbox box (`role="checkbox"`).
 * @csspart indicator - Checkmark / indeterminate glyph container.
 * @csspart label - Label wrapper.
 *
 * @fires input - Fired when the user toggles the checkbox.
 * @fires change - Fired when the user toggles the checkbox.
 */
export class KCheckbox extends FormAssociatedElement {
  static override styles = checkboxStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="base" class="base"><button part="control" class="control" type="button" role="checkbox" aria-checked="false"><span part="indicator" class="indicator" aria-hidden="true"></span></button><span part="label" class="label"><slot></slot></span></div>`;

  @prop({ type: Boolean, reflect: true }) accessor checked = false;
  @prop({ type: Boolean, reflect: true }) accessor indeterminate = false;
  @prop() accessor value = 'on';
  @prop({ reflect: true }) accessor size: CheckboxSize = 'md';

  #base!: HTMLDivElement;
  #control!: HTMLButtonElement;
  #indicator!: HTMLSpanElement;
  #defaultChecked = false;
  #defaultCaptured = false;

  constructor() {
    super();
    this.addEventListener('click', this.#onHostClick, { capture: true });
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultChecked = this.hasAttribute('checked') || this.checked;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override click(): void {
    if (this.#control) this.#control.click();
    else super.click();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.indeterminate = false;
    this.checked = this.#defaultChecked;
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#control = this.renderRoot.querySelector('.control') as HTMLButtonElement;
    this.#indicator = this.renderRoot.querySelector('.indicator') as HTMLSpanElement;

    const slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    const syncSlot = (): void => {
      const hasText = slot
        .assignedNodes({ flatten: true })
        .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent?.trim().length ?? 0) > 0);
      slot.parentElement?.classList.toggle('has-content', hasText);
    };
    slot.addEventListener('slotchange', syncSlot);
    syncSlot();
  }

  protected override update(_changed: PropertyValues): void {
    const disabled = this.isDisabled;
    this.#control.disabled = disabled;
    this.#base.classList.toggle('disabled', disabled);

    const ariaChecked = this.indeterminate ? 'mixed' : this.checked ? 'true' : 'false';
    this.#control.setAttribute('aria-checked', ariaChecked);
    this.#control.setAttribute('aria-required', this.required ? 'true' : 'false');

    const iconName = this.indeterminate ? 'minus' : 'check';
    this.#indicator.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon(iconName) ?? ''}</svg>`;

    this.setFormValue(this.checked ? this.value : null);
    this.setValidity(
      { valueMissing: this.required && !this.checked },
      'Please check this box if you want to proceed.',
      this.#control,
    );
  }

  #onHostClick = (event: MouseEvent): void => {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.indeterminate = false;
    this.checked = !this.checked;
    this.markInteracted();
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };
}
