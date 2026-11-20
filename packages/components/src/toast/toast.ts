import {
  KernoElement,
  emit,
  enterTopLayer,
  exitTopLayer,
  isServer,
  prop,
  type PropertyValues,
} from '@kerno/core';
import { slideIn, slideOut, type MotionHandle } from '@kerno/effects/motion';
import { getIcon } from '@kerno/primitives/icon';
import { toastContainerStyles, toastStyles } from './toast.styles.js';

export type ToastVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type ToastPlacement =
  'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end';
export type ToastCloseSource = 'timeout' | 'close-button' | 'programmatic';

export interface ToastCloseDetail {
  source: ToastCloseSource;
}

const VARIANT_ICON: Record<ToastVariant, string> = {
  neutral: 'info',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

/**
 * Individual Fluent 1 notification toast with hover/focus countdown pausing,
 * optional action button, and acrylic glass surface support.
 *
 * @tag k-toast
 *
 * @slot - Optional rich body content (appended after `description`).
 * @slot action - Optional custom action elements.
 *
 * @csspart base - Toast surface container.
 * @csspart icon - Semantic status icon wrapper.
 * @csspart title - Heading text.
 * @csspart description - Description text container.
 * @csspart action-button - Built-in action button (when `action-label` is set).
 * @csspart close-button - Dismiss button.
 * @csspart progress - Countdown hairline bar.
 *
 * @fires k-action - Fired when the built-in action button is clicked.
 * @fires k-close - Cancelable event fired before dismissing.
 * @fires k-after-close - Fired after exit animation finishes.
 */
export class KToast extends KernoElement {
  static override styles = toastStyles;
  static override template = /* html */ `<div part="base" class="base"><span part="icon" class="icon" aria-hidden="true"></span><div class="body"><div part="title" class="title"></div><div part="description" class="description"><span class="desc-text"></span><slot></slot></div><div class="actions"><button part="action-button" class="action-btn" type="button" hidden></button><slot name="action"></slot></div></div><button part="close-button" class="close-btn" type="button" aria-label="Dismiss"></button><div part="progress" class="progress" aria-hidden="true" hidden></div></div>`;

  @prop({ reflect: true }) accessor variant: ToastVariant = 'info';
  @prop({ reflect: true }) override accessor title = '';
  @prop({ reflect: true }) accessor description = '';
  /** Auto-dismiss timeout in milliseconds (`0` disables auto-dismiss). */
  @prop({ type: Number, reflect: true }) accessor duration = 4000;
  @prop({ type: Boolean, reflect: true }) accessor closable = true;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, reflect: true }) accessor open = true;
  @prop({ attribute: 'action-label', reflect: true }) accessor actionLabel = '';

  #base!: HTMLDivElement;
  #iconEl!: HTMLSpanElement;
  #titleEl!: HTMLDivElement;
  #descWrap!: HTMLDivElement;
  #descText!: HTMLSpanElement;
  #defaultSlot!: HTMLSlotElement;
  #actionsWrap!: HTMLDivElement;
  #actionBtn!: HTMLButtonElement;
  #actionSlot!: HTMLSlotElement;
  #closeBtn!: HTMLButtonElement;
  #progressEl!: HTMLDivElement;

  #timerId: ReturnType<typeof setTimeout> | null = null;
  #remainingMs = 0;
  #startedAt = 0;
  #hovered = false;
  #focused = false;
  #closing = false;
  #entered = false;
  #anim: MotionHandle | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!isServer && this.open && !this.#entered) {
      this.#entered = true;
      queueMicrotask(() => {
        if (!this.isConnected || !this.open) return;
        this.#playEnter();
        this.#startTimer(this.duration);
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#clearTimer();
    this.#anim?.cancel();
    this.#anim = null;
  }

  /** Dismisses the toast with an exit animation (fires cancelable `k-close`). */
  async dismiss(source: ToastCloseSource = 'programmatic'): Promise<boolean> {
    if (this.#closing || !this.open) return false;
    const allowed = emit<ToastCloseDetail>(this, 'k-close', { source }, { cancelable: true });
    if (!allowed) return false;

    this.#closing = true;
    this.#clearTimer();
    const offset = this.#slideOffset();
    this.#anim = slideOut(this.#base, offset, { duration: 'fast' });
    await this.#anim.finished;
    this.#anim = null;
    this.open = false;
    this.#closing = false;
    emit(this, 'k-after-close', { source });
    return true;
  }

  /** Pauses the auto-dismiss countdown (also triggered automatically on hover/focus). */
  pause(): void {
    if (this.#timerId === null) return;
    const elapsed = performance.now() - this.#startedAt;
    this.#remainingMs = Math.max(0, this.#remainingMs - elapsed);
    this.#clearTimer();
    this.toggleAttribute('data-paused', true);
  }

  /** Resumes the remaining auto-dismiss countdown. */
  resume(): void {
    if (this.#hovered || this.#focused || this.#closing || !this.open) return;
    if (this.duration <= 0 || this.#remainingMs <= 0) return;
    this.toggleAttribute('data-paused', false);
    this.#scheduleTimer(this.#remainingMs);
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#iconEl = this.renderRoot.querySelector('.icon') as HTMLSpanElement;
    this.#titleEl = this.renderRoot.querySelector('.title') as HTMLDivElement;
    this.#descWrap = this.renderRoot.querySelector('.description') as HTMLDivElement;
    this.#descText = this.renderRoot.querySelector('.desc-text') as HTMLSpanElement;
    this.#defaultSlot = this.renderRoot.querySelector('slot:not([name])') as HTMLSlotElement;
    this.#actionsWrap = this.renderRoot.querySelector('.actions') as HTMLDivElement;
    this.#actionBtn = this.renderRoot.querySelector('.action-btn') as HTMLButtonElement;
    this.#actionSlot = this.renderRoot.querySelector('slot[name="action"]') as HTMLSlotElement;
    this.#closeBtn = this.renderRoot.querySelector('.close-btn') as HTMLButtonElement;
    this.#progressEl = this.renderRoot.querySelector('.progress') as HTMLDivElement;

    this.#closeBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;

    this.#closeBtn.addEventListener('click', () => {
      void this.dismiss('close-button');
    });

    this.#actionBtn.addEventListener('click', () => {
      emit(this, 'k-action');
    });

    this.addEventListener('pointerenter', () => {
      this.#hovered = true;
      this.pause();
    });
    this.addEventListener('pointerleave', () => {
      this.#hovered = false;
      this.resume();
    });
    this.addEventListener('focusin', () => {
      this.#focused = true;
      this.pause();
    });
    this.addEventListener('focusout', () => {
      this.#focused = false;
      this.resume();
    });

    this.#defaultSlot.addEventListener('slotchange', () => this.#syncContent());
    this.#actionSlot.addEventListener('slotchange', () => this.#syncContent());
  }

  protected override update(changed: PropertyValues): void {
    const urgent = this.variant === 'danger' || this.variant === 'warning';
    this.#base.setAttribute('role', urgent ? 'alert' : 'status');
    this.#base.setAttribute('aria-live', urgent ? 'assertive' : 'polite');

    const iconName = VARIANT_ICON[this.variant] ?? 'info';
    this.#iconEl.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon(iconName) ?? ''}</svg>`;

    this.#titleEl.textContent = this.title;
    this.#closeBtn.hidden = !this.closable;
    this.#syncContent();

    if (changed.has('duration') && this.open && this.isConnected && !this.#closing) {
      this.#startTimer(this.duration);
    }
  }

  #syncContent(): void {
    this.#descText.textContent = this.description;
    const hasSlotBody = this.#defaultSlot
      .assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || Boolean(n.textContent?.trim()));
    this.#descWrap.classList.toggle('has-content', Boolean(this.description) || hasSlotBody);

    const hasActionBtn = Boolean(this.actionLabel.trim());
    this.#actionBtn.hidden = !hasActionBtn;
    this.#actionBtn.textContent = this.actionLabel;
    const hasSlotAction = this.#actionSlot.assignedNodes().length > 0;
    this.#actionsWrap.classList.toggle('has-content', hasActionBtn || hasSlotAction);
  }

  #slideOffset(): { x?: number; y?: number } {
    const parent = this.parentElement;
    const placement = parent?.getAttribute('placement') ?? 'bottom-end';
    if (placement.endsWith('start')) return { x: -24 };
    if (placement.endsWith('end')) return { x: 24 };
    if (placement.startsWith('top')) return { y: -16 };
    return { y: 16 };
  }

  #playEnter(): void {
    if (!this.#base) return;
    this.#anim = slideIn(this.#base, this.#slideOffset(), { duration: 'normal' });
  }

  #startTimer(ms: number): void {
    this.#clearTimer();
    this.toggleAttribute('data-paused', false);
    if (ms > 0) {
      this.#remainingMs = ms;
      this.#progressEl.hidden = false;
      this.#progressEl.style.setProperty('--_duration', `${ms}ms`);
      // Restart CSS keyframe cleanly when duration changes
      this.#progressEl.style.animation = 'none';
      void this.#progressEl.offsetWidth;
      this.#progressEl.style.animation = '';
      if (!this.#hovered && !this.#focused) {
        this.#scheduleTimer(ms);
      } else {
        this.toggleAttribute('data-paused', true);
      }
    } else {
      this.#remainingMs = 0;
      this.#progressEl.hidden = true;
    }
  }

  #scheduleTimer(ms: number): void {
    this.#clearTimer();
    this.#startedAt = performance.now();
    this.#timerId = setTimeout(() => {
      this.#timerId = null;
      this.#remainingMs = 0;
      void this.dismiss('timeout');
    }, ms);
  }

  #clearTimer(): void {
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
  }
}

/**
 * Top-Layer viewport container managing a stack of `<k-toast>` elements.
 *
 * @tag k-toast-container
 *
 * @slot - `<k-toast>` elements.
 *
 * @csspart viewport - Top-layer fixed stack container.
 */
export class KToastContainer extends KernoElement {
  static override styles = toastContainerStyles;
  static override template = /* html */ `<div part="viewport" class="viewport" role="region" aria-label="Notifications"><slot></slot></div>`;

  @prop({ reflect: true }) accessor placement: ToastPlacement = 'bottom-end';
  /** Maximum simultaneous toasts (`0` = unlimited). Oldest toasts are dismissed automatically. */
  @prop({ type: Number, reflect: true }) accessor max = 5;
  /** Propagates `acrylic` to slotted `<k-toast>` items that do not explicitly set it. */
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;

  #viewport!: HTMLDivElement;
  #slot!: HTMLSlotElement;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    exitTopLayer(this.#viewport);
  }

  protected override setup(): void {
    this.#viewport = this.renderRoot.querySelector('.viewport') as HTMLDivElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    this.#slot.addEventListener('slotchange', () => this.#syncStack());
  }

  protected override update(_changed: PropertyValues): void {
    this.#syncStack();
  }

  #syncStack(): void {
    const toasts = this.#slot
      .assignedElements({ flatten: true })
      .filter((el): el is KToast => el.tagName.toLowerCase() === 'k-toast');

    if (toasts.length > 0) {
      this.#viewport.classList.add('active');
      enterTopLayer(this.#viewport);
    } else {
      this.#viewport.classList.remove('active');
      exitTopLayer(this.#viewport);
    }

    if (this.acrylic) {
      for (const item of toasts) {
        if (!item.hasAttribute('acrylic')) {
          item.acrylic = true;
        }
      }
    }

    if (this.max > 0 && toasts.length > this.max) {
      const overflow = toasts.length - this.max;
      for (let i = 0; i < overflow; i++) {
        void toasts[i]!.dismiss('programmatic');
      }
    }
  }
}
