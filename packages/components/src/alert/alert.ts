import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { fadeOut } from '@kerno/effects/motion';
import { ShapeOutlineController, type CornerKind } from '@kerno/effects/shape';
import { getIcon } from '@kerno/primitives/icon';
import { alertStyles } from './alert.styles.js';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const VARIANT_ICON: Record<AlertVariant, string> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'info',
};

/**
 * Fluent 1 InfoBar / inline notification banner with status accent strip,
 * optional actions, dismissible control, and parametric `shape` support.
 *
 * @tag k-alert
 *
 * @slot icon - Optional custom icon (defaults to semantic status icon).
 * @slot title - Optional rich heading (overrides `title` attribute).
 * @slot - Alert message body.
 * @slot action - Optional trailing action buttons.
 *
 * @csspart base - Banner container (`role="alert"` or `role="status"`).
 * @csspart icon - Status icon wrapper.
 * @csspart content - Title + description stack.
 * @csspart title - Heading element.
 * @csspart description - Body text wrapper.
 * @csspart action - Action controls slot wrapper.
 * @csspart close-button - Dismiss button.
 *
 * @fires k-close - Cancelable event fired when the user clicks the dismiss button.
 */
export class KAlert extends KernoElement {
  static override styles = alertStyles;
  static override template = /* html */ `<div part="base" class="base"><span part="icon" class="icon" aria-hidden="true"><slot name="icon"></slot><span class="icon-fallback"></span></span><div part="content" class="content"><div part="title" class="title"><slot name="title"></slot><span class="title-fallback"></span></div><div part="description" class="description"><slot></slot></div></div><div part="action" class="action"><slot name="action"></slot></div><button part="close-button" class="close-btn" type="button" aria-label="Dismiss" hidden></button></div>`;

  @prop({ reflect: true }) accessor variant: AlertVariant = 'info';
  @prop({ reflect: true }) override accessor title = '';
  @prop({ type: Boolean, reflect: true }) accessor closable = false;
  @prop({ type: Boolean, reflect: true }) accessor open = true;
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';

  #base!: HTMLDivElement;
  #iconSlot!: HTMLSlotElement;
  #iconFallback!: HTMLSpanElement;
  #titleWrap!: HTMLDivElement;
  #titleSlot!: HTMLSlotElement;
  #titleFallback!: HTMLSpanElement;
  #descWrap!: HTMLDivElement;
  #defaultSlot!: HTMLSlotElement;
  #actionWrap!: HTMLDivElement;
  #actionSlot!: HTMLSlotElement;
  #closeBtn!: HTMLButtonElement;

  readonly #shapeOutline = new ShapeOutlineController(this, {
    getTarget: () => this.#base ?? null,
    getKind: () => this.shape,
    fallbackRadius: 6,
    strokeInset: 0.75,
  });

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#iconSlot = this.renderRoot.querySelector('slot[name="icon"]') as HTMLSlotElement;
    this.#iconFallback = this.renderRoot.querySelector('.icon-fallback') as HTMLSpanElement;
    this.#titleWrap = this.renderRoot.querySelector('.title') as HTMLDivElement;
    this.#titleSlot = this.renderRoot.querySelector('slot[name="title"]') as HTMLSlotElement;
    this.#titleFallback = this.renderRoot.querySelector('.title-fallback') as HTMLSpanElement;
    this.#descWrap = this.renderRoot.querySelector('.description') as HTMLDivElement;
    this.#defaultSlot = this.renderRoot.querySelector('slot:not([name])') as HTMLSlotElement;
    this.#actionWrap = this.renderRoot.querySelector('.action') as HTMLDivElement;
    this.#actionSlot = this.renderRoot.querySelector('slot[name="action"]') as HTMLSlotElement;
    this.#closeBtn = this.renderRoot.querySelector('.close-btn') as HTMLButtonElement;

    this.#closeBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;
    this.#closeBtn.addEventListener('click', () => this.#handleClose());

    this.#iconSlot.addEventListener('slotchange', () => this.#syncIcon());
    this.#titleSlot.addEventListener('slotchange', () => this.#syncSlots());
    this.#defaultSlot.addEventListener('slotchange', () => this.#syncSlots());
    this.#actionSlot.addEventListener('slotchange', () => this.#syncSlots());
  }

  protected override update(changed: PropertyValues): void {
    const isUrgent = this.variant === 'danger' || this.variant === 'warning';
    this.#base.setAttribute('role', isUrgent ? 'alert' : 'status');
    this.#closeBtn.hidden = !this.closable;

    this.#syncIcon();
    this.#syncSlots();

    if (changed.has('shape') || changed.has('open')) {
      this.#shapeOutline.sync();
    }
  }

  /** Programmatically dismisses the alert (fires cancelable `k-close`). */
  async close(): Promise<boolean> {
    if (!this.open) return false;
    const allowed = emit(this, 'k-close', undefined, { cancelable: true });
    if (!allowed) return false;
    await fadeOut(this.#base, { duration: 'fast' }).finished;
    this.open = false;
    return true;
  }

  #handleClose(): void {
    void this.close();
  }

  #syncIcon(): void {
    const hasCustomIcon = this.#iconSlot.assignedNodes().length > 0;
    this.#iconFallback.hidden = hasCustomIcon;
    if (!hasCustomIcon) {
      const name = VARIANT_ICON[this.variant] ?? 'info';
      this.#iconFallback.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon(name) ?? ''}</svg>`;
    }
  }

  #syncSlots(): void {
    const hasTitleSlot = this.#titleSlot.assignedNodes().length > 0;
    this.#titleFallback.hidden = hasTitleSlot;
    this.#titleFallback.textContent = this.title;
    this.#titleWrap.classList.toggle('has-content', hasTitleSlot || this.title.length > 0);

    const hasBody = this.#defaultSlot
      .assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || Boolean(n.textContent?.trim()));
    this.#descWrap.classList.toggle('has-content', hasBody);

    const hasAction = this.#actionSlot.assignedNodes().length > 0;
    this.#actionWrap.classList.toggle('has-content', hasAction);
  }
}
