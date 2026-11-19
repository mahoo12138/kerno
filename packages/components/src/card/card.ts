import { KernoElement, prop, type PropertyValues } from '@kerno/core';
import '@kerno/effects/surface/define';
import type { CornerKind, ElevationLevel, KSurface } from '@kerno/effects';
import { cardStyles } from './card.styles.js';

/**
 * Structured content card built on `<k-surface>`, inheriting Shape, Elevation,
 * Acrylic, Reveal Highlight and Pressure effects.
 *
 * @tag k-card
 *
 * @slot header - Card title or header actions.
 * @slot - Main card content.
 * @slot footer - Card footer actions.
 *
 * @csspart surface - Underlying `<k-surface>`.
 * @csspart header - Header container.
 * @csspart body - Body container.
 * @csspart footer - Footer container.
 */
export class KCard extends KernoElement {
  static override styles = cardStyles;
  static override template = /* html */ `<k-surface part="surface" class="surface"><div part="header" class="header"><slot name="header"></slot><span class="title-fallback"></span></div><div part="body" class="body"><slot></slot></div><div part="footer" class="footer"><slot name="footer"></slot></div></k-surface>`;

  @prop({ reflect: true }) override accessor title = '';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ reflect: true }) accessor radius = '';
  @prop({ type: Number, reflect: true }) accessor elevation: ElevationLevel = 1;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, reflect: true }) accessor reveal = false;
  @prop({ type: Boolean, reflect: true }) accessor pressure = false;
  @prop({ type: Boolean, reflect: true }) accessor interactive = false;

  #surface!: KSurface;
  #header!: HTMLDivElement;
  #headerSlot!: HTMLSlotElement;
  #titleFallback!: HTMLSpanElement;

  protected override setup(): void {
    this.#surface = this.renderRoot.querySelector('k-surface') as KSurface;
    this.#header = this.renderRoot.querySelector('.header') as HTMLDivElement;
    this.#headerSlot = this.renderRoot.querySelector('slot[name="header"]') as HTMLSlotElement;
    this.#titleFallback = this.renderRoot.querySelector('.title-fallback') as HTMLSpanElement;

    this.#headerSlot.addEventListener('slotchange', () => this.#syncHeader());

    const footerSlot = this.renderRoot.querySelector('slot[name="footer"]') as HTMLSlotElement;
    const syncFooter = (): void => {
      footerSlot.parentElement?.classList.toggle(
        'has-content',
        footerSlot.assignedNodes().length > 0,
      );
    };
    footerSlot.addEventListener('slotchange', syncFooter);
    syncFooter();
  }

  protected override update(_changed: PropertyValues): void {
    this.#surface.shape = this.shape;
    this.#surface.radius = this.radius;
    this.#surface.elevation = this.elevation;
    this.#surface.acrylic = this.acrylic;
    this.#surface.reveal = this.reveal || this.interactive;
    this.#surface.pressure = this.pressure || this.interactive;
    this.#syncHeader();
  }

  #syncHeader(): void {
    const hasSlotted = this.#headerSlot.assignedNodes().length > 0;
    this.#titleFallback.hidden = hasSlotted;
    this.#titleFallback.textContent = this.title;
    this.#header.classList.toggle('has-content', hasSlotted || this.title.length > 0);
  }
}
