import {
  KernoElement,
  LocalizeController,
  emit,
  isServer,
  prop,
  type PropertyValues,
} from '@kerno/core';
import { spoilerStyles } from './spoiler.styles.js';

export interface SpoilerToggleDetail {
  expanded: boolean;
}

/**
 * Collapses long text or content blocks to `max-height` with a subtle gradient
 * fade and toggles full height smoothly on demand. Automatically hides the
 * toggle control when slotted content fits within `max-height`.
 *
 * @tag k-spoiler
 *
 * @slot - Collapsible content.
 *
 * @csspart clip - Animated height-clipping container.
 * @csspart toggle - Show more / Show less action link button.
 *
 * @fires k-toggle - Fired when expanded state toggles (`{ expanded }`).
 */
export class KSpoiler extends KernoElement {
  static override styles = spoilerStyles;
  static override template = /* html */ `<div part="clip" class="clip"><div class="measure"><slot></slot></div><div class="fade" aria-hidden="true"></div></div><button part="toggle" class="toggle" type="button" aria-expanded="false" hidden></button>`;
  readonly #localize = new LocalizeController(this);

  @prop({ type: Number, attribute: 'max-height', reflect: true }) accessor maxHeight = 100;
  @prop({ type: Boolean, reflect: true }) accessor expanded = false;
  @prop({ attribute: 'show-label', reflect: true }) accessor showLabel = '';
  @prop({ attribute: 'hide-label', reflect: true }) accessor hideLabel = '';

  #clip!: HTMLDivElement;
  #measure!: HTMLDivElement;
  #toggle!: HTMLButtonElement;
  #slot!: HTMLSlotElement;
  #ro: ResizeObserver | null = null;
  #overflows = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!isServer && typeof ResizeObserver === 'function' && this.#measure && !this.#ro) {
      this.#ro = new ResizeObserver(() => this.#syncMeasure());
      this.#ro.observe(this.#measure);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#ro?.disconnect();
    this.#ro = null;
  }

  protected override setup(): void {
    this.#clip = this.renderRoot.querySelector('.clip') as HTMLDivElement;
    this.#measure = this.renderRoot.querySelector('.measure') as HTMLDivElement;
    this.#toggle = this.renderRoot.querySelector('.toggle') as HTMLButtonElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;

    this.#toggle.addEventListener('click', () => {
      this.expanded = !this.expanded;
      emit<SpoilerToggleDetail>(this, 'k-toggle', { expanded: this.expanded });
    });

    this.#slot.addEventListener('slotchange', () => this.#syncMeasure());
    if (!isServer && typeof ResizeObserver === 'function') {
      this.#ro = new ResizeObserver(() => this.#syncMeasure());
      this.#ro.observe(this.#measure);
    }
  }

  protected override update(_changed: PropertyValues): void {
    this.#syncMeasure();
  }

  #syncMeasure(): void {
    const limit = Math.max(20, Math.floor(this.maxHeight) || 100);
    const fullHeight = this.#measure.scrollHeight;
    this.#overflows = fullHeight > limit + 2;

    this.#toggle.hidden = !this.#overflows;
    this.#toggle.textContent = this.expanded
      ? this.hideLabel || this.#localize.term('showLess')
      : this.showLabel || this.#localize.term('showMore');
    this.#toggle.setAttribute('aria-expanded', this.expanded ? 'true' : 'false');

    const collapsed = this.#overflows && !this.expanded;
    this.#clip.classList.toggle('collapsed', collapsed);
    this.#clip.style.maxHeight = collapsed
      ? `${limit}px`
      : fullHeight > 0
        ? `${fullHeight}px`
        : 'none';
  }
}
