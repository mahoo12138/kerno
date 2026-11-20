import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { listItemStyles, listStyles } from './list.styles.js';

export type ListSelectionMode = 'none' | 'single' | 'multiple';

export interface ListSelectDetail {
  selectedValues: string[];
  item: KListItem;
}

/**
 * Structured row item inside `<k-list>`.
 *
 * @tag k-list-item
 *
 * @slot prefix - Leading avatar, icon, or status glyph.
 * @slot - Primary item title.
 * @slot description - Secondary supporting caption.
 * @slot suffix - Trailing metadata, badges, or action buttons.
 *
 * @csspart base - Item row container.
 * @csspart prefix - Prefix wrapper.
 * @csspart title - Primary text wrapper.
 * @csspart description - Description wrapper.
 * @csspart suffix - Suffix wrapper.
 */
export class KListItem extends KernoElement {
  static override styles = listItemStyles;
  static override template = /* html */ `<div part="base" class="base"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><div class="body"><div part="title" class="title"><slot></slot></div><div part="description" class="description"><slot name="description"></slot></div></div><span part="suffix" class="suffix"><slot name="suffix"></slot></span></div>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ type: Boolean, reflect: true }) accessor selected = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;
  @prop({ type: Boolean, reflect: true }) accessor interactive = false;

  #base!: HTMLDivElement;

  setSelectable(selectable: boolean): void {
    this.toggleAttribute('data-selectable', selectable);
    if (this.#base) {
      this.#base.setAttribute('role', selectable ? 'option' : 'listitem');
    }
  }

  setRowTabIndex(tabIndex: number): void {
    if (this.#base) this.#base.tabIndex = tabIndex;
  }

  focusItem(): void {
    this.#base?.focus();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    emit(this, 'k-list-item-connect', undefined, { bubbles: true, composed: true });
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#base.setAttribute('role', 'listitem');

    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('slot[name]')) {
      const sync = (): void => {
        const has = slot
          .assignedNodes({ flatten: true })
          .some((n) => n.nodeType === Node.ELEMENT_NODE || Boolean(n.textContent?.trim()));
        slot.parentElement?.classList.toggle('has-content', has);
      };
      slot.addEventListener('slotchange', sync);
      sync();
    }

    this.#base.addEventListener('click', () => {
      if (this.disabled) return;
      emit(this, 'k-list-item-click', { item: this }, { bubbles: true, composed: true });
    });
  }

  protected override update(_changed: PropertyValues): void {
    if (this.hasAttribute('data-selectable')) {
      this.#base.setAttribute('aria-selected', this.selected ? 'true' : 'false');
    } else {
      this.#base.removeAttribute('aria-selected');
    }
    this.#base.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
  }
}

/**
 * Fluent 1 list container supporting static display, single selection, or
 * multi-selection with keyboard navigation and chromatic Accent indicators.
 *
 * @tag k-list
 *
 * @slot - `<k-list-item>` elements.
 *
 * @fires k-list-select - Fired when selection changes (`{ selectedValues, item }`).
 */
export class KList extends KernoElement {
  static override styles = listStyles;
  static override template = /* html */ `<div part="base" class="base"><slot></slot></div>`;

  @prop({ reflect: true }) accessor selection: ListSelectionMode = 'none';
  @prop({ type: Boolean, reflect: true }) accessor bordered = true;
  @prop({ type: Boolean, reflect: true }) accessor divided = true;
  @prop({ type: Boolean, reflect: true }) accessor dense = false;
  @prop({ reflect: true }) accessor label = 'List';

  #base!: HTMLDivElement;
  #slot!: HTMLSlotElement;

  get selectedValues(): string[] {
    return this.#items()
      .filter((i) => i.selected)
      .map((i) => i.value || (i.textContent?.trim() ?? ''));
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;

    this.#slot.addEventListener('slotchange', () => this.#syncItems());
    this.addEventListener('k-list-item-connect', (e) => {
      e.stopPropagation();
      this.#syncItems();
    });

    this.addEventListener('k-list-item-click', (e) => {
      const detail = (e as CustomEvent<{ item: KListItem }>).detail;
      if (!detail?.item) return;
      e.stopPropagation();
      this.#handleSelect(detail.item);
    });

    this.addEventListener('keydown', (e) => this.#onKeyDown(e));
  }

  protected override update(_changed: PropertyValues): void {
    const selectable = this.selection !== 'none';
    this.#base.setAttribute('role', selectable ? 'listbox' : 'list');
    this.#base.setAttribute('aria-label', this.label || 'List');
    if (selectable) {
      this.#base.setAttribute(
        'aria-multiselectable',
        this.selection === 'multiple' ? 'true' : 'false',
      );
    } else {
      this.#base.removeAttribute('aria-multiselectable');
    }
    this.#syncItems();
  }

  #items(): KListItem[] {
    return this.#slot
      .assignedElements({ flatten: true })
      .filter((el): el is KListItem => el instanceof KListItem);
  }

  #syncItems(focused?: KListItem): void {
    const items = this.#items();
    const selectable = this.selection !== 'none';
    const enabled = items.filter((i) => !i.disabled && !i.hidden);
    const active =
      (focused && enabled.includes(focused) ? focused : null) ??
      enabled.find((i) => i.selected) ??
      enabled[0] ??
      null;

    for (const item of items) {
      item.setSelectable(selectable);
      item.setRowTabIndex(selectable && item === active ? 0 : -1);
    }
  }

  #handleSelect(item: KListItem): void {
    if (item.disabled || this.selection === 'none') return;
    this.#syncItems(item);

    if (this.selection === 'single') {
      for (const peer of this.#items()) {
        peer.selected = peer === item;
      }
    } else {
      item.selected = !item.selected;
    }

    emit<ListSelectDetail>(this, 'k-list-select', {
      selectedValues: this.selectedValues,
      item,
    });
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (this.selection === 'none') return;
    const enabled = this.#items().filter((i) => !i.disabled && !i.hidden);
    if (enabled.length === 0) return;

    const path = event.composedPath();
    const current = enabled.find((i) => path.includes(i));
    if (!current) return;
    const idx = enabled.indexOf(current);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = enabled[(idx + 1) % enabled.length]!;
      this.#syncItems(next);
      next.focusItem();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = enabled[(idx - 1 + enabled.length) % enabled.length]!;
      this.#syncItems(prev);
      prev.focusItem();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.#syncItems(enabled[0]!);
      enabled[0]!.focusItem();
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = enabled[enabled.length - 1]!;
      this.#syncItems(last);
      last.focusItem();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#handleSelect(current);
    }
  }
}
