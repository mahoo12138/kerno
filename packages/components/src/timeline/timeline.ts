import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { timelineItemStyles, timelineStyles } from './timeline.styles.js';

export type TimelineAlign = 'left' | 'right';
export type TimelineLineVariant = 'solid' | 'dashed' | 'dotted';

/**
 * Individual chronological entry inside `<k-timeline>`.
 *
 * @tag k-timeline-item
 *
 * @slot - Event description body.
 * @slot bullet - Optional custom bullet content (e.g. `<k-icon>` or `<k-avatar>`).
 */
export class KTimelineItem extends KernoElement {
  static override styles = timelineItemStyles;
  static override template = /* html */ `<div class="rail" aria-hidden="true"><span part="bullet" class="bullet"><slot name="bullet"><span class="bullet-icon"></span></slot></span><span part="line" class="line"></span></div><div part="body" class="body"><p part="title" class="title"></p><div class="content"><slot></slot></div><span part="timestamp" class="timestamp"></span></div>`;

  @prop({ reflect: true }) override accessor title = '';
  @prop({ reflect: true }) accessor timestamp = '';
  /** Optional icon name from `@kerno/primitives/icon`. */
  @prop({ reflect: true }) accessor icon = '';
  @prop({ attribute: 'line-variant', reflect: true })
  accessor lineVariant: TimelineLineVariant = 'solid';

  #titleEl!: HTMLParagraphElement;
  #timestampEl!: HTMLSpanElement;
  #bulletIcon!: HTMLSpanElement;

  override connectedCallback(): void {
    super.connectedCallback();
    emit(this, 'k-timeline-item-connect', { item: this });
  }

  protected override setup(): void {
    this.#titleEl = this.renderRoot.querySelector('.title') as HTMLParagraphElement;
    this.#timestampEl = this.renderRoot.querySelector('.timestamp') as HTMLSpanElement;
    this.#bulletIcon = this.renderRoot.querySelector('.bullet-icon') as HTMLSpanElement;
  }

  protected override update(_changed: PropertyValues): void {
    this.#titleEl.textContent = this.title;
    this.#timestampEl.textContent = this.timestamp;
    const svg = this.icon ? getIcon(this.icon) : undefined;
    this.#bulletIcon.innerHTML = svg ? `<svg viewBox="0 0 16 16">${svg}</svg>` : '';
  }
}

/**
 * Chronological activity / audit timeline highlighting completed nodes and
 * connectors up to `active`, supporting left/right alignment and solid, dashed,
 * or dotted connector variants.
 *
 * @tag k-timeline
 *
 * @slot - `<k-timeline-item>` entries.
 */
export class KTimeline extends KernoElement {
  static override styles = timelineStyles;
  static override template = /* html */ `<slot></slot>`;

  /** Highest active item index (`-1` disables highlight). */
  @prop({ type: Number, reflect: true }) accessor active = -1;
  @prop({ reflect: true }) accessor align: TimelineAlign = 'left';
  @prop({ type: Number, attribute: 'bullet-size', reflect: true }) accessor bulletSize = 22;
  @prop({ type: Number, attribute: 'line-width', reflect: true }) accessor lineWidth = 2;
  @prop({ type: Boolean, attribute: 'reverse-active', reflect: true })
  accessor reverseActive = false;

  #slot!: HTMLSlotElement;

  protected override setup(): void {
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    this.#slot.addEventListener('slotchange', () => this.#syncItems());
    this.addEventListener('k-timeline-item-connect', (e) => {
      e.stopPropagation();
      this.#syncItems();
    });
  }

  protected override update(_changed: PropertyValues): void {
    if (Number.isFinite(this.bulletSize) && this.bulletSize > 0) {
      this.style.setProperty('--k-timeline-bullet-size', `${this.bulletSize}px`);
    }
    if (Number.isFinite(this.lineWidth) && this.lineWidth > 0) {
      this.style.setProperty('--k-timeline-line-width', `${this.lineWidth}px`);
    }
    this.#syncItems();
  }

  #syncItems(): void {
    const items = this.#slot
      .assignedElements({ flatten: true })
      .filter((el): el is KTimelineItem => el instanceof KTimelineItem);
    const total = items.length;
    const active = Math.floor(this.active);

    items.forEach((item, idx) => {
      const isActive =
        active >= 0 && (this.reverseActive ? idx >= total - 1 - active : idx <= active);
      const isLineActive =
        active >= 0 && (this.reverseActive ? idx >= total - 1 - active : idx < active);

      item.toggleAttribute('data-active', isActive);
      item.toggleAttribute('data-line-active', isLineActive);
      item.toggleAttribute('data-last', idx === total - 1);
      item.setAttribute('data-align', this.align);
    });
  }
}
