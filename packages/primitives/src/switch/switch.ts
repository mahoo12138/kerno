import {
  AriaForwardingController,
  FormAssociatedElement,
  prop,
  type PropertyValues,
} from '@kerno/core';
import type { CornerKind } from '@kerno/effects/shape';
import { LazyShapeOutlineController } from '@kerno/effects/shape/lazy';
import { switchStyles } from './switch.styles.js';

export type SwitchSize = 'sm' | 'md' | 'lg';
export type SwitchShape = CornerKind;

/**
 * Form-associated toggle switch with `role="switch"` semantics, motion-token
 * thumb animation and constraint validation.
 *
 * @tag k-switch
 *
 * @slot - Switch label text.
 *
 * @csspart base - Outer interactive wrapper.
 * @csspart track - Focusable switch track (`role="switch"`).
 * @csspart thumb - Sliding thumb indicator.
 * @csspart label - Label wrapper.
 *
 * @fires input - Fired when the user toggles the switch.
 * @fires change - Fired when the user toggles the switch.
 */
export class KSwitch extends FormAssociatedElement {
  static override styles = switchStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="base" class="base"><button part="track" class="track" type="button" role="switch" aria-checked="false"><span part="thumb" class="thumb" aria-hidden="true"></span></button><span part="label" class="label" id="label"><slot></slot></span></div>`;

  @prop({ type: Boolean, reflect: true }) accessor checked = false;
  @prop() accessor value = 'on';
  @prop({ reflect: true }) accessor size: SwitchSize = 'md';
  @prop({ reflect: true }) accessor shape: SwitchShape = 'rounded';

  #base!: HTMLDivElement;
  #track!: HTMLButtonElement;
  #defaultChecked = false;
  #defaultCaptured = false;
  readonly #shapeOutline = new LazyShapeOutlineController(this, {
    getTarget: () => this.#track ?? null,
    getKind: () => this.shape,
    fallbackRadius: 999,
  });

  constructor() {
    super();
    this.addEventListener('click', this.#onHostClick, { capture: true });
    // Forward host aria-label / aria-labelledby / <label for> to the focused inner element.
    new AriaForwardingController(this, {
      getTarget: () => this.#track,
      // Name the control by its visible slotted label while it has content.
      getInternalLabelId: () => this.renderRoot.querySelector('#label.has-content') && 'label',
    });
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultChecked = this.hasAttribute('checked') || this.checked;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override click(): void {
    if (this.#track) this.#track.click();
    else super.click();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.checked = this.#defaultChecked;
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#track = this.renderRoot.querySelector('.track') as HTMLButtonElement;

    const slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    const syncSlot = (): void => {
      const hasText = slot
        .assignedNodes({ flatten: true })
        .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent?.trim().length ?? 0) > 0);
      slot.parentElement?.classList.toggle('has-content', hasText);
      // Re-sync the forwarded accessible name now that the visible label changed.
      this.requestUpdate();
    };
    slot.addEventListener('slotchange', syncSlot);
    syncSlot();
  }

  protected override update(changed: PropertyValues): void {
    const disabled = this.isDisabled;
    this.#track.disabled = disabled;
    this.#base.classList.toggle('disabled', disabled);
    this.#track.setAttribute('aria-checked', this.checked ? 'true' : 'false');
    this.#track.setAttribute('aria-required', this.required ? 'true' : 'false');

    if (
      changed.has('shape') ||
      changed.has('size') ||
      changed.has('disabled') ||
      changed.has('formDisabled')
    ) {
      this.#shapeOutline.sync();
    }

    this.setFormValue(this.checked ? this.value : null);
    this.setValidity(
      { valueMissing: this.required && !this.checked },
      this.localize.term('switchRequired'),
      this.#track,
    );
  }

  #onHostClick = (event: MouseEvent): void => {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.checked = !this.checked;
    this.markInteracted();
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };
}
