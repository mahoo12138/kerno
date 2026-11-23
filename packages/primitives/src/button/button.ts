import {
  AriaForwardingController,
  FormAssociatedElement,
  prop,
  type PropertyValues,
} from '@kerno/core';
import type { CornerKind } from '@kerno/effects/shape';
import { LazyShapeOutlineController } from '@kerno/effects/shape/lazy';
import { buttonStyles } from './button.styles.js';

export type ButtonVariant = 'standard' | 'accent' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonShape = CornerKind;

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
 * @cssprop --k-button-border-hover
 */
export class KButton extends FormAssociatedElement {
  static override styles = buttonStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="base" class="base" type="button"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><span part="label" class="label"><slot></slot></span><span part="suffix" class="suffix"><slot name="suffix"></slot></span></button>`;

  @prop({ reflect: true }) accessor variant: ButtonVariant = 'standard';
  @prop({ reflect: true }) accessor size: ButtonSize = 'md';
  /** Corner geometry family (`'rounded' | 'chamfer' | 'scallop' | 'notch'`). */
  @prop({ reflect: true }) accessor shape: ButtonShape = 'rounded';
  /** Displays an inline spinner, sets `aria-busy="true"` and blocks activation while keeping focus. */
  @prop({ type: Boolean, reflect: true }) accessor loading = false;
  /** Form behavior when activated. */
  @prop() accessor type: ButtonType = 'button';
  /** Submitted with the form as `name=value` when this button submits it. */
  @prop() accessor value = '';

  #base!: HTMLButtonElement;
  #spinnerEl: HTMLSpanElement | null = null;
  readonly #shapeOutline = new LazyShapeOutlineController(this, {
    getTarget: () => this.#base ?? null,
    getKind: () => this.shape,
  });

  constructor() {
    super();
    // Capture phase: swallow activation while disabled before user handlers run.
    this.addEventListener('click', this.#onClick, { capture: true });
    // Forward host aria-label / aria-labelledby / aria-describedby to the inner button.
    new AriaForwardingController(this, { getTarget: () => this.#base });
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
    if (changed.has('loading')) {
      this.#syncLoading();
    }
    if (
      changed.has('shape') ||
      changed.has('size') ||
      changed.has('disabled') ||
      changed.has('formDisabled')
    ) {
      this.#shapeOutline.sync();
    }
  }

  #syncLoading(): void {
    if (this.loading) {
      this.#base.setAttribute('aria-busy', 'true');
      if (!this.#spinnerEl) {
        const span = document.createElement('span');
        span.className = 'spinner';
        span.setAttribute('part', 'spinner');
        span.setAttribute('aria-hidden', 'true');
        span.innerHTML =
          '<svg viewBox="0 0 16 16" fill="none"><path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M8 2.2a5.8 5.8 0 1 1-4.1 1.7"/></svg>';
        this.#base.insertBefore(span, this.#base.querySelector('.prefix'));
        this.#spinnerEl = span;
      }
    } else {
      this.#base.removeAttribute('aria-busy');
      this.#spinnerEl?.remove();
      this.#spinnerEl = null;
    }
  }

  #onClick = (event: MouseEvent): void => {
    if (this.isDisabled || this.loading) {
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
