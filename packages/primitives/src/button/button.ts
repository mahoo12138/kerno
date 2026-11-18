import { FormAssociatedElement, prop, type PropertyValues } from '@kerno/core';
import { buttonStyles } from './button.styles.js';

export type ButtonVariant = 'standard' | 'accent' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

/**
 * A button that participates in forms.
 *
 * @tag k-button
 *
 * @slot - Label.
 * @slot prefix - Content before the label (usually an icon).
 * @slot suffix - Content after the label.
 *
 * @csspart base - The native `<button>`.
 * @csspart label - Label wrapper.
 * @csspart prefix - Prefix wrapper.
 * @csspart suffix - Suffix wrapper.
 *
 * @cssprop --k-button-height
 * @cssprop --k-button-padding-x
 * @cssprop --k-button-gap
 * @cssprop --k-button-radius
 * @cssprop --k-button-font-size
 * @cssprop --k-button-font-weight
 * @cssprop --k-button-bg
 * @cssprop --k-button-bg-hover
 * @cssprop --k-button-bg-active
 * @cssprop --k-button-fg
 * @cssprop --k-button-border-color
 */
export class KButton extends FormAssociatedElement {
  static override styles = buttonStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="base" class="base" type="button"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><span part="label" class="label"><slot></slot></span><span part="suffix" class="suffix"><slot name="suffix"></slot></span></button>`;

  @prop({ reflect: true }) accessor variant: ButtonVariant = 'standard';
  @prop({ reflect: true }) accessor size: ButtonSize = 'md';
  /** Form behavior when activated. */
  @prop() accessor type: ButtonType = 'button';
  /** Submitted with the form as `name=value` when this button submits it. */
  @prop() accessor value = '';

  #base!: HTMLButtonElement;

  constructor() {
    super();
    // Capture phase: swallow activation while disabled before user handlers run.
    this.addEventListener('click', this.#onClick, { capture: true });
  }

  override click(): void {
    if (this.#base) this.#base.click();
    else super.click();
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLButtonElement;
    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('slot[name]')) {
      const sync = (): void => {
        slot.parentElement?.classList.toggle('has-content', slot.assignedNodes().length > 0);
      };
      slot.addEventListener('slotchange', sync);
      sync();
    }
  }

  protected override update(changed: PropertyValues): void {
    if (changed.has('disabled') || changed.has('formDisabled')) {
      this.#base.disabled = this.isDisabled;
    }
  }

  #onClick = (event: MouseEvent): void => {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const form = this.form;
    if (!form || this.type === 'button') return;
    if (this.type === 'reset') {
      form.reset();
      return;
    }
    this.#submit(form);
  };

  /**
   * `form.requestSubmit(submitter)` only accepts native buttons, so a hidden
   * native submitter is used. This keeps constraint validation, the submit
   * event's `submitter`-dependent behavior and `name=value` submission intact.
   */
  #submit(form: HTMLFormElement): void {
    const proxy = document.createElement('button');
    proxy.type = 'submit';
    proxy.hidden = true;
    if (this.name) proxy.name = this.name;
    if (this.value) proxy.value = this.value;
    for (const attr of [
      'formaction',
      'formenctype',
      'formmethod',
      'formnovalidate',
      'formtarget',
    ]) {
      const value = this.getAttribute(attr);
      if (value !== null) proxy.setAttribute(attr, value);
    }
    form.append(proxy);
    proxy.click();
    proxy.remove();
  }
}
