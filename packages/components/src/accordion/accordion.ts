import { KernoElement, emit, prop, uniqueId, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { accordionItemStyles, accordionStyles } from './accordion.styles.js';

export interface AccordionToggleDetail {
  value: string;
  open: boolean;
}

export interface AccordionChangeDetail {
  openValues: string[];
}

/**
 * Single collapsible section inside `<k-accordion>` (also usable standalone as
 * a Fluent 1 Expander).
 *
 * @tag k-accordion-item
 *
 * @slot header - Optional rich header content (overrides `heading`).
 * @slot - Collapsible body content.
 *
 * @csspart trigger - Header `<button>` with `aria-expanded` and `aria-controls`.
 * @csspart chevron - Rotating expand indicator icon.
 * @csspart panel - Collapsible `role="region"` container.
 * @csspart body - Padded inner content wrapper.
 *
 * @fires k-toggle - Fired when this item's open state changes (`{ value, open }`).
 */
export class KAccordionItem extends KernoElement {
  static override styles = accordionItemStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div class="header" role="heading" aria-level="3"><button part="trigger" class="trigger" type="button" aria-expanded="false"><span class="heading-text"><slot name="header"></slot><span class="heading-fallback"></span></span><span part="chevron" class="chevron" aria-hidden="true"></span></button></div><div class="panel-wrap"><div part="panel" class="panel" role="region"><div part="body" class="body"><slot></slot></div></div></div>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor heading = '';
  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  readonly #triggerId = uniqueId('k-acc-trigger');
  readonly #panelId = uniqueId('k-acc-panel');

  #trigger!: HTMLButtonElement;
  #headerSlot!: HTMLSlotElement;
  #headingFallback!: HTMLSpanElement;
  #chevron!: HTMLSpanElement;
  #panel!: HTMLDivElement;

  /** Focuses this item's header trigger button. */
  focusTrigger(): void {
    this.#trigger?.focus();
  }

  protected override setup(): void {
    this.#trigger = this.renderRoot.querySelector('.trigger') as HTMLButtonElement;
    this.#headerSlot = this.renderRoot.querySelector('slot[name="header"]') as HTMLSlotElement;
    this.#headingFallback = this.renderRoot.querySelector('.heading-fallback') as HTMLSpanElement;
    this.#chevron = this.renderRoot.querySelector('.chevron') as HTMLSpanElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;

    this.#trigger.id = this.#triggerId;
    this.#trigger.setAttribute('aria-controls', this.#panelId);
    this.#panel.id = this.#panelId;
    this.#panel.setAttribute('aria-labelledby', this.#triggerId);
    this.#chevron.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevron-down') ?? ''}</svg>`;

    this.#headerSlot.addEventListener('slotchange', () => this.#syncHeading());

    this.#trigger.addEventListener('click', () => {
      if (this.disabled) return;
      const handledByParent = !emit(
        this,
        'k-accordion-item-request',
        { item: this, nextOpen: !this.open },
        { bubbles: true, composed: true, cancelable: true },
      );
      if (!handledByParent) {
        this.open = !this.open;
        emit<AccordionToggleDetail>(this, 'k-toggle', {
          value: this.value || this.heading,
          open: this.open,
        });
      }
    });
  }

  protected override update(_changed: PropertyValues): void {
    this.#trigger.disabled = this.disabled;
    this.#trigger.setAttribute('aria-expanded', this.open ? 'true' : 'false');
    this.#panel.setAttribute('aria-hidden', this.open ? 'false' : 'true');
    this.#panel.inert = !this.open;
    this.#syncHeading();
  }

  #syncHeading(): void {
    const hasSlot = this.#headerSlot.assignedNodes().length > 0;
    this.#headingFallback.hidden = hasSlot;
    this.#headingFallback.textContent = this.heading;
  }
}

/**
 * Vertically stacked collapsible sections supporting single or multiple open
 * items and WAI-ARIA `ArrowUp`/`ArrowDown`/`Home`/`End` header navigation.
 *
 * @tag k-accordion
 *
 * @slot - `<k-accordion-item>` elements.
 *
 * @fires k-accordion-change - Fired when the set of open items changes (`{ openValues }`).
 */
export class KAccordion extends KernoElement {
  static override styles = accordionStyles;
  static override template = /* html */ `<slot></slot>`;

  /** Allows multiple items to remain expanded simultaneously. */
  @prop({ type: Boolean, reflect: true }) accessor multiple = false;
  /** In single-expand mode, allows closing the currently open item (`false` keeps one open). */
  @prop({ type: Boolean, reflect: true }) accessor collapsible = true;

  protected override setup(): void {
    this.addEventListener('k-accordion-item-request', this.#onItemRequest);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  protected override update(changed: PropertyValues): void {
    if (changed.has('multiple') && !this.multiple) {
      const openItems = this.#items().filter((i) => i.open);
      if (openItems.length > 1) {
        for (let idx = 1; idx < openItems.length; idx++) {
          openItems[idx]!.open = false;
        }
      }
    }
  }

  #items(): KAccordionItem[] {
    return [...this.children].filter(
      (el): el is KAccordionItem => el.tagName.toLowerCase() === 'k-accordion-item',
    );
  }

  #onItemRequest = (event: Event): void => {
    const detail = (event as CustomEvent<{ item: KAccordionItem; nextOpen: boolean }>).detail;
    const items = this.#items();
    if (!detail || !items.includes(detail.item)) return;

    event.preventDefault();
    event.stopPropagation();

    const { item, nextOpen } = detail;

    if (!this.multiple) {
      if (!nextOpen && !this.collapsible) {
        // Keep the single open item expanded when `collapsible` is false.
        return;
      }
      for (const peer of items) {
        if (peer !== item && peer.open) {
          peer.open = false;
          emit<AccordionToggleDetail>(peer, 'k-toggle', {
            value: peer.value || peer.heading,
            open: false,
          });
        }
      }
    }

    item.open = nextOpen;
    emit<AccordionToggleDetail>(item, 'k-toggle', {
      value: item.value || item.heading,
      open: item.open,
    });

    const openValues = items.filter((i) => i.open).map((i) => i.value || i.heading);
    emit<AccordionChangeDetail>(this, 'k-accordion-change', { openValues });
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key;
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;

    const enabled = this.#items().filter((i) => !i.disabled && !i.hidden);
    if (enabled.length === 0) return;

    const path = event.composedPath();
    const currentIdx = enabled.findIndex((item) => path.includes(item));
    if (currentIdx === -1) return;

    // Only hijack vertical arrow keys when focus is on the header button itself.
    const currentItem = enabled[currentIdx]!;
    const trigger = currentItem.shadowRoot?.querySelector('.trigger');
    if (trigger && !path.includes(trigger)) return;

    event.preventDefault();
    let nextIdx = currentIdx;
    if (key === 'ArrowDown') nextIdx = (currentIdx + 1) % enabled.length;
    else if (key === 'ArrowUp') nextIdx = (currentIdx - 1 + enabled.length) % enabled.length;
    else if (key === 'Home') nextIdx = 0;
    else if (key === 'End') nextIdx = enabled.length - 1;

    enabled[nextIdx]!.focusTrigger();
  };
}
