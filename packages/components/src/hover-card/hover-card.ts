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
import { fadeOut, slideIn, type MotionHandle } from '@kerno/effects/motion';
import { hoverCardStyles } from './hover-card.styles.js';

/**
 * Interactive hover preview card rendered in the browser Top Layer. Unlike a
 * plain tooltip, `<k-hover-card>` stays open while the pointer moves into the
 * card body so users can read rich previews or click links and buttons inside.
 *
 * @tag k-hover-card
 *
 * @slot trigger - Element that reveals the card on hover or focus.
 * @slot - Rich card preview content.
 *
 * @csspart card - Floating Top-Layer preview surface.
 *
 * @fires k-open - Fired when the hover card opens.
 * @fires k-close - Fired when the hover card closes.
 */
export class KHoverCard extends KernoElement {
  static override styles = hoverCardStyles;
  static override template = /* html */ `<span class="trigger"><slot name="trigger"></slot></span><div part="card" class="card" role="dialog"><slot></slot></div>`;

  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ reflect: true }) accessor placement: Placement = 'bottom-start';
  @prop({ type: Number, reflect: true }) accessor offset = 8;
  @prop({ type: Number, attribute: 'open-delay', reflect: true }) accessor openDelay = 200;
  @prop({ type: Number, attribute: 'close-delay', reflect: true }) accessor closeDelay = 180;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  readonly #overlayId = uniqueId('k-hovercard');

  #trigger!: HTMLSpanElement;
  #card!: HTMLDivElement;

  #wasOpen = false;
  #openTimer: ReturnType<typeof setTimeout> | null = null;
  #closeTimer: ReturnType<typeof setTimeout> | null = null;
  #stopPosition: (() => void) | null = null;
  #exitAnim: MotionHandle | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#clearTimers();
    this.#cleanupOverlay();
  }

  protected override setup(): void {
    this.#trigger = this.renderRoot.querySelector('.trigger') as HTMLSpanElement;
    this.#card = this.renderRoot.querySelector('.card') as HTMLDivElement;

    this.#trigger.addEventListener('pointerenter', () => this.#scheduleOpen());
    this.#trigger.addEventListener('pointerleave', () => this.#scheduleClose());
    this.#trigger.addEventListener('focusin', () => this.#scheduleOpen());
    this.#trigger.addEventListener('focusout', () => this.#scheduleClose());

    this.#card.addEventListener('pointerenter', () => this.#cancelClose());
    this.#card.addEventListener('pointerleave', () => this.#scheduleClose());
    this.#card.addEventListener('focusin', () => this.#cancelClose());
    this.#card.addEventListener('focusout', () => this.#scheduleClose());
  }

  protected override update(_changed: PropertyValues): void {
    if (this.disabled && this.open) {
      this.open = false;
    }
    if (this.open && !this.#wasOpen && !this.disabled) {
      this.#openOverlay();
    } else if ((!this.open || this.disabled) && this.#wasOpen) {
      this.#closeOverlay();
    }
    this.#wasOpen = this.open && !this.disabled;
  }

  #clearTimers(): void {
    if (this.#openTimer !== null) {
      clearTimeout(this.#openTimer);
      this.#openTimer = null;
    }
    if (this.#closeTimer !== null) {
      clearTimeout(this.#closeTimer);
      this.#closeTimer = null;
    }
  }

  #cancelClose(): void {
    if (this.#closeTimer !== null) {
      clearTimeout(this.#closeTimer);
      this.#closeTimer = null;
    }
  }

  #scheduleOpen(): void {
    if (this.disabled) return;
    this.#cancelClose();
    if (this.open || this.#openTimer !== null) return;
    const delay = Math.max(0, Number(this.openDelay) || 0);
    if (delay === 0) {
      this.open = true;
      return;
    }
    this.#openTimer = setTimeout(() => {
      this.#openTimer = null;
      if (!this.disabled) this.open = true;
    }, delay);
  }

  #scheduleClose(): void {
    if (this.#openTimer !== null) {
      clearTimeout(this.#openTimer);
      this.#openTimer = null;
    }
    if (!this.open) return;
    this.#cancelClose();
    const delay = Math.max(0, Number(this.closeDelay) || 0);
    if (delay === 0) {
      this.open = false;
      return;
    }
    this.#closeTimer = setTimeout(() => {
      this.#closeTimer = null;
      this.open = false;
    }, delay);
  }

  #openOverlay(): void {
    if (this.#exitAnim) {
      this.#exitAnim.cancel();
      this.#exitAnim = null;
      this.#card.classList.remove('closing');
    }
    enterTopLayer(this.#card);
    this.#stopPosition = autoPosition(this.#trigger, this.#card, {
      placement: this.placement,
      offset: this.offset,
    });
    overlayManager.add({
      id: this.#overlayId,
      content: this.#card,
      trigger: this.#trigger,
      trapFocus: false,
      restoreFocus: false,
      closeOnEscape: true,
      closeOnOutsideClick: true,
      onRequestClose: () => {
        this.open = false;
      },
    });
    slideIn(this.#card, { y: -4 }, { duration: 'fast' });
    emit(this, 'k-open', {});
  }

  #closeOverlay(): void {
    overlayManager.remove(this.#overlayId, false);
    this.#stopPosition?.();
    this.#stopPosition = null;
    this.#card.classList.add('closing');
    this.#exitAnim = fadeOut(this.#card, { duration: 'fast' });
    void this.#exitAnim.finished.then(() => {
      if (this.open) return;
      this.#card.classList.remove('closing');
      exitTopLayer(this.#card);
      this.#exitAnim = null;
    });
    emit(this, 'k-close', {});
  }

  #cleanupOverlay(): void {
    this.#exitAnim?.cancel();
    this.#exitAnim = null;
    this.#stopPosition?.();
    this.#stopPosition = null;
    exitTopLayer(this.#card);
    overlayManager.remove(this.#overlayId, false);
    this.#wasOpen = false;
  }
}
