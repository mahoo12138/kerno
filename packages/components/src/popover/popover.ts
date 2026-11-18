import {
  KernoElement,
  autoPosition,
  emit,
  overlayManager,
  prop,
  uniqueId,
  type Placement,
  type PropertyValues,
} from '@kerno/core';
import { scaleIn } from '@kerno/effects/motion';
import { popoverStyles } from './popover.styles.js';

export type PopoverTrigger = 'click' | 'manual';

/**
 * Floating non-modal popover panel anchored to a trigger element, coordinated
 * by `overlayManager` and `autoPosition`.
 *
 * @tag k-popover
 *
 * @slot trigger - Anchor element that toggles the popover.
 * @slot - Popover content.
 *
 * @csspart trigger - Trigger wrapper.
 * @csspart panel - Floating popover panel.
 *
 * @fires k-open - Fired when the popover opens.
 * @fires k-close - Fired when the popover closes.
 */
export class KPopover extends KernoElement {
  static override styles = popoverStyles;
  static override template = /* html */ `<span part="trigger" class="trigger"><slot name="trigger"></slot></span><div part="panel" class="panel" role="dialog"><slot></slot></div>`;

  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ reflect: true }) accessor placement: Placement = 'bottom';
  @prop({ type: Number }) accessor offset = 8;
  @prop({ reflect: true }) accessor trigger: PopoverTrigger = 'click';
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;

  readonly #overlayId = uniqueId('k-popover');

  #triggerEl!: HTMLSpanElement;
  #triggerSlot!: HTMLSlotElement;
  #panel!: HTMLDivElement;
  #stopPositioning: (() => void) | null = null;
  #wasOpen = false;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanup();
    this.#wasOpen = false;
  }

  show(): void {
    this.open = true;
  }

  hide(): void {
    this.open = false;
  }

  toggle(): void {
    this.open = !this.open;
  }

  protected override setup(): void {
    this.#triggerEl = this.renderRoot.querySelector('.trigger') as HTMLSpanElement;
    this.#triggerSlot = this.renderRoot.querySelector('slot[name="trigger"]') as HTMLSlotElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;

    this.#triggerEl.addEventListener('click', () => {
      if (this.trigger === 'click') {
        this.toggle();
      }
    });

    this.#triggerSlot.addEventListener('slotchange', () => this.#syncAriaExpanded());
  }

  protected override update(_changed: PropertyValues): void {
    this.#syncAriaExpanded();

    if (this.open && !this.#wasOpen) {
      this.#wasOpen = true;
      const anchor = this.#getAnchorElement();
      this.#stopPositioning = autoPosition(anchor, this.#panel, {
        placement: this.placement,
        offset: this.offset,
      });
      overlayManager.add({
        id: this.#overlayId,
        content: this.#panel,
        trigger: this.#triggerEl,
        trapFocus: false,
        lockScroll: false,
        restoreFocus: true,
        closeOnEscape: true,
        closeOnOutsideClick: true,
        onRequestClose: () => {
          this.open = false;
        },
      });
      scaleIn(this.#panel, { duration: 'fast' });
      emit(this, 'k-open');
    } else if (!this.open && this.#wasOpen) {
      this.#wasOpen = false;
      this.#cleanup();
      emit(this, 'k-close');
    } else if (this.open && this.#wasOpen) {
      this.#stopPositioning?.();
      this.#stopPositioning = autoPosition(this.#getAnchorElement(), this.#panel, {
        placement: this.placement,
        offset: this.offset,
      });
    }
  }

  #getAnchorElement(): Element {
    return this.#triggerSlot.assignedElements({ flatten: true })[0] ?? this.#triggerEl;
  }

  #syncAriaExpanded(): void {
    const target = this.#triggerSlot.assignedElements({ flatten: true })[0];
    if (target) {
      target.setAttribute('aria-expanded', this.open ? 'true' : 'false');
      target.setAttribute('aria-haspopup', 'dialog');
    }
  }

  #cleanup(): void {
    this.#stopPositioning?.();
    this.#stopPositioning = null;
    overlayManager.remove(this.#overlayId);
  }
}
