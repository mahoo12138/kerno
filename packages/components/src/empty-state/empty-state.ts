import { KernoElement, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { emptyStateStyles } from './empty-state.styles.js';

/**
 * Structured empty state display with icon, title, description and action slot.
 *
 * @tag k-empty-state
 *
 * @slot - Optional action buttons.
 *
 * @csspart base - Outer container.
 * @csspart icon - Icon badge.
 * @csspart title - Heading.
 * @csspart description - Description paragraph.
 * @csspart actions - Action buttons row.
 */
export class KEmptyState extends KernoElement {
  static override styles = emptyStateStyles;
  static override template = /* html */ `<div part="base" class="base"><div part="icon" class="icon" aria-hidden="true"></div><h3 part="title" class="title"></h3><p part="description" class="description"></p><div part="actions" class="actions"><slot></slot></div></div>`;

  @prop({ reflect: true }) accessor icon = 'info';
  @prop({ reflect: true }) override accessor title = 'No data';
  @prop({ reflect: true }) accessor description = '';

  #iconEl!: HTMLDivElement;
  #titleEl!: HTMLHeadingElement;
  #descEl!: HTMLParagraphElement;

  protected override setup(): void {
    this.#iconEl = this.renderRoot.querySelector('.icon') as HTMLDivElement;
    this.#titleEl = this.renderRoot.querySelector('.title') as HTMLHeadingElement;
    this.#descEl = this.renderRoot.querySelector('.description') as HTMLParagraphElement;

    const slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    const syncSlot = (): void => {
      slot.parentElement?.classList.toggle('has-content', slot.assignedElements().length > 0);
    };
    slot.addEventListener('slotchange', syncSlot);
    syncSlot();
  }

  protected override update(_changed: PropertyValues): void {
    const svg = getIcon(this.icon) ?? getIcon('info') ?? '';
    this.#iconEl.innerHTML = `<svg viewBox="0 0 16 16">${svg}</svg>`;
    this.#titleEl.textContent = this.title;
    this.#descEl.textContent = this.description;
  }
}
