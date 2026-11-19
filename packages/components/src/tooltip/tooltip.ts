import {
  KernoElement,
  autoPosition,
  emit,
  enterTopLayer,
  exitTopLayer,
  overlayManager,
  prop,
  uniqueId,
  type Placement,
  type PropertyValues,
} from '@kerno/core';
import { fadeIn, fadeOut, type MotionHandle } from '@kerno/effects/motion';
import { tooltipStyles } from './tooltip.styles.js';

/**
 * Accessible floating tooltip triggered by pointer hover or keyboard focus.
 *
 * @tag k-tooltip
 *
 * @slot - Trigger element.
 * @slot content - Rich tooltip content (overrides `content` attribute).
 *
 * @csspart trigger - Trigger wrapper.
 * @csspart popup - Tooltip surface (`role="tooltip"`).
 *
 * @fires k-open - Fired when the tooltip opens.
 * @fires k-close - Fired when the tooltip closes.
 */
export class KTooltip extends KernoElement {
  static override styles = tooltipStyles;
  static override template = /* html */ `<span part="trigger" class="trigger"><slot></slot></span><div part="popup" class="popup" role="tooltip"><slot name="content"></slot><span class="text"></span></div>`;

  @prop({ reflect: true }) accessor content = '';
  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ reflect: true }) accessor placement: Placement = 'top';
  @prop({ type: Number }) accessor offset = 6;
  @prop({ type: Number }) accessor delay = 0;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  readonly #overlayId = uniqueId('k-tooltip');

  #triggerEl!: HTMLSpanElement;
  #defaultSlot!: HTMLSlotElement;
  #contentSlot!: HTMLSlotElement;
  #popup!: HTMLDivElement;
  #text!: HTMLSpanElement;
  #stopPositioning: (() => void) | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #wasOpen = false;
  #exitAnim: MotionHandle | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#clearTimer();
    this.#cancelExit();
    this.#cleanup();
    this.#wasOpen = false;
  }

  show(): void {
    if (this.disabled) return;
    this.#clearTimer();
    this.open = true;
  }

  hide(): void {
    this.#clearTimer();
    this.open = false;
  }

  protected override setup(): void {
    this.#triggerEl = this.renderRoot.querySelector('.trigger') as HTMLSpanElement;
    this.#defaultSlot = this.renderRoot.querySelector('slot:not([name])') as HTMLSlotElement;
    this.#contentSlot = this.renderRoot.querySelector('slot[name="content"]') as HTMLSlotElement;
    this.#popup = this.renderRoot.querySelector('.popup') as HTMLDivElement;
    this.#text = this.renderRoot.querySelector('.text') as HTMLSpanElement;

    this.#popup.id = this.#overlayId;

    this.#contentSlot.addEventListener('slotchange', () => {
      this.#text.hidden = this.#contentSlot.assignedNodes().length > 0;
    });

    this.#defaultSlot.addEventListener('slotchange', () => {
      const target = this.#defaultSlot.assignedElements({ flatten: true })[0];
      if (target && !target.hasAttribute('aria-describedby')) {
        target.setAttribute('aria-describedby', this.#overlayId);
      }
    });

    this.#triggerEl.addEventListener('pointerenter', () => {
      if (this.disabled) return;
      this.#clearTimer();
      if (this.delay > 0) {
        this.#timer = setTimeout(() => {
          this.open = true;
        }, this.delay);
      } else {
        this.open = true;
      }
    });

    this.#triggerEl.addEventListener('pointerleave', () => {
      this.hide();
    });

    this.#triggerEl.addEventListener('focusin', () => {
      if (!this.disabled) this.show();
    });

    this.#triggerEl.addEventListener('focusout', () => {
      this.hide();
    });
  }

  protected override update(_changed: PropertyValues): void {
    this.#text.textContent = this.content;

    if (this.disabled && this.open) {
      this.open = false;
    }

    if (this.open && !this.#wasOpen) {
      this.#wasOpen = true;
      this.#cancelExit();
      enterTopLayer(this.#popup);
      const anchor = this.#defaultSlot.assignedElements({ flatten: true })[0] ?? this.#triggerEl;
      this.#stopPositioning = autoPosition(anchor, this.#popup, {
        placement: this.placement,
        offset: this.offset,
      });
      overlayManager.add({
        id: this.#overlayId,
        content: this.#popup,
        trigger: this.#triggerEl,
        trapFocus: false,
        lockScroll: false,
        restoreFocus: false,
        closeOnEscape: true,
        closeOnOutsideClick: false,
        onRequestClose: () => {
          this.open = false;
        },
      });
      fadeIn(this.#popup);
      emit(this, 'k-open');
    } else if (!this.open && this.#wasOpen) {
      this.#wasOpen = false;
      overlayManager.remove(this.#overlayId, false);
      emit(this, 'k-close');
      this.#playExit();
    }
  }

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  #playExit(): void {
    this.#popup.classList.add('closing');
    const anim = fadeOut(this.#popup, { duration: 'fast' });
    this.#exitAnim = anim;
    void anim.finished.then(() => {
      if (this.open) return;
      this.#popup.classList.remove('closing');
      this.#stopPositioning?.();
      this.#stopPositioning = null;
      exitTopLayer(this.#popup);
      this.#exitAnim = null;
    });
  }

  #cancelExit(): void {
    this.#exitAnim?.cancel();
    this.#exitAnim = null;
    this.#popup?.classList.remove('closing');
  }

  #cleanup(): void {
    this.#stopPositioning?.();
    this.#stopPositioning = null;
    exitTopLayer(this.#popup);
    overlayManager.remove(this.#overlayId, false);
  }
}
