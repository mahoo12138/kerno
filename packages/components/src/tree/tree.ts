import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { treeItemStyles, treeStyles } from './tree.styles.js';

export type TreeSelectionMode = 'single' | 'multiple' | 'none';

export interface TreeSelectDetail {
  selectedValues: string[];
  item: KTreeItem;
}

export interface TreeCheckDetail {
  checkedValues: string[];
  item: KTreeItem;
}

export interface TreeLoadDetail {
  value: string;
  item: KTreeItem;
}

/**
 * Hierarchical tree node inside `<k-tree>`. Nest child `<k-tree-item>`
 * elements in the default slot; provide label text via `label` attribute or
 * `slot="label"`.
 *
 * @tag k-tree-item
 *
 * @slot icon - Optional leading icon.
 * @slot label - Optional rich label (overrides `label` attribute).
 * @slot - Nested child `<k-tree-item>` elements.
 *
 * @csspart row - Focusable treeitem row.
 * @csspart toggle - Expand/collapse chevron button.
 * @csspart checkbox - Inline Fluent checkbox (visible when parent `<k-tree checkable>`).
 * @csspart label - Node label text.
 * @csspart children - Child branch group (`role="group"`).
 */
export class KTreeItem extends KernoElement {
  static override styles = treeItemStyles;
  static override template = /* html */ `<div part="row" class="row" role="treeitem" tabindex="-1"><button part="toggle" class="toggle leaf" type="button" tabindex="-1" aria-label="Toggle branch"></button><button part="checkbox" class="check" type="button" tabindex="-1" role="checkbox" aria-checked="false" hidden></button><span class="icon"><slot name="icon"></slot></span><span part="label" class="label"><slot name="label"></slot><span class="label-fallback"></span></span></div><div part="children" class="children" role="group"><slot></slot></div>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor label = '';
  @prop({ type: Boolean, reflect: true }) accessor expanded = false;
  @prop({ type: Boolean, reflect: true }) accessor selected = false;
  @prop({ type: Boolean, reflect: true }) accessor checked = false;
  @prop({ type: Boolean, reflect: true }) accessor indeterminate = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;
  /** Marks this node as lazily loadable (renders expand chevron even before children exist). */
  @prop({ type: Boolean, reflect: true }) accessor lazy = false;
  @prop({ type: Boolean, reflect: true }) accessor loading = false;

  /** Managed by parent `<k-tree>`. */
  @prop({ type: Boolean }) accessor showCheckbox = false;

  #row!: HTMLDivElement;
  #toggle!: HTMLButtonElement;
  #checkBtn!: HTMLButtonElement;
  #iconSlot!: HTMLSlotElement;
  #labelSlot!: HTMLSlotElement;
  #labelFallback!: HTMLSpanElement;
  #childSlot!: HTMLSlotElement;

  /** Direct child `<k-tree-item>` elements. */
  get childItems(): KTreeItem[] {
    return [...this.children].filter((el): el is KTreeItem => el instanceof KTreeItem);
  }

  /** Parent `<k-tree-item>`, or `null` if top-level. */
  get parentItem(): KTreeItem | null {
    const p = this.parentElement;
    return p instanceof KTreeItem ? p : null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    emit(this, 'k-tree-structure-change', undefined, { bubbles: true, composed: true });
  }

  /** Whether this node is a branch (has children or is lazy). */
  get isBranch(): boolean {
    return this.childItems.length > 0 || this.lazy;
  }

  /** Sets roving tabindex on the internal row. */
  setRowTabIndex(tabIndex: number): void {
    if (this.#row) this.#row.tabIndex = tabIndex;
  }

  /** Focuses this tree item's interactive row. */
  focusRow(): void {
    this.#row?.focus();
  }

  /** Sets visual nesting depth (managed by parent `<k-tree>`). */
  setLevel(level: number): void {
    this.style.setProperty('--_tree-level', String(level));
    this.#row?.setAttribute('aria-level', String(level + 1));
  }

  protected override setup(): void {
    this.#row = this.renderRoot.querySelector('.row') as HTMLDivElement;
    this.#toggle = this.renderRoot.querySelector('.toggle') as HTMLButtonElement;
    this.#checkBtn = this.renderRoot.querySelector('.check') as HTMLButtonElement;
    this.#iconSlot = this.renderRoot.querySelector('slot[name="icon"]') as HTMLSlotElement;
    this.#labelSlot = this.renderRoot.querySelector('slot[name="label"]') as HTMLSlotElement;
    this.#labelFallback = this.renderRoot.querySelector('.label-fallback') as HTMLSpanElement;
    this.#childSlot = this.renderRoot.querySelector('slot:not([name])') as HTMLSlotElement;

    this.#iconSlot.addEventListener('slotchange', () => {
      this.#iconSlot.parentElement?.classList.toggle(
        'has-content',
        this.#iconSlot.assignedNodes().length > 0,
      );
    });
    this.#labelSlot.addEventListener('slotchange', () => this.#syncLabel());
    this.#childSlot.addEventListener('slotchange', () => {
      this.#syncBranch();
      emit(this, 'k-tree-structure-change', undefined, { bubbles: true, composed: true });
    });

    this.#toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.disabled || !this.isBranch) return;
      emit(this, 'k-tree-item-toggle', { item: this }, { bubbles: true, composed: true });
    });

    this.#checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.disabled) return;
      emit(this, 'k-tree-item-check', { item: this }, { bubbles: true, composed: true });
    });

    this.#row.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.disabled) return;
      this.focusRow();
      emit(this, 'k-tree-item-select', { item: this }, { bubbles: true, composed: true });
    });
  }

  protected override update(_changed: PropertyValues): void {
    this.#syncLabel();
    this.#syncBranch();

    this.#row.setAttribute('aria-selected', this.selected ? 'true' : 'false');
    this.#row.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');

    this.#checkBtn.hidden = !this.showCheckbox;
    this.#checkBtn.disabled = this.disabled;
    const ariaChecked = this.indeterminate ? 'mixed' : this.checked ? 'true' : 'false';
    this.#checkBtn.setAttribute('aria-checked', ariaChecked);
    this.#checkBtn.innerHTML = this.indeterminate
      ? `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('minus') ?? ''}</svg>`
      : this.checked
        ? `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('check') ?? ''}</svg>`
        : '';
  }

  #syncLabel(): void {
    const hasSlot = this.#labelSlot.assignedNodes().length > 0;
    this.#labelFallback.hidden = hasSlot;
    this.#labelFallback.textContent = this.label;
  }

  #syncBranch(): void {
    const branch = this.isBranch;
    this.#toggle.classList.toggle('leaf', !branch);
    this.#toggle.classList.toggle('spinning', this.loading);
    const iconName = this.loading ? 'loader' : 'chevron-right';
    this.#toggle.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon(iconName) ?? ''}</svg>`;

    if (branch) {
      this.#row.setAttribute('aria-expanded', this.expanded ? 'true' : 'false');
    } else {
      this.#row.removeAttribute('aria-expanded');
    }
  }
}

/**
 * Accessible WAI-ARIA TreeView supporting single/multiple selection,
 * hierarchical cascade checkboxes with automatic `indeterminate` parent state,
 * lazy branch loading, and full keyboard navigation.
 *
 * @tag k-tree
 *
 * @slot - Top-level `<k-tree-item>` nodes.
 *
 * @fires k-tree-select - Fired when node selection changes (`{ selectedValues, item }`).
 * @fires k-tree-check - Fired when checkbox state changes (`{ checkedValues, item }`).
 * @fires k-tree-load - Fired when a `lazy` node expands without children (`{ value, item }`).
 */
export class KTree extends KernoElement {
  static override styles = treeStyles;
  static override template = /* html */ `<div part="base" class="base" role="tree"><slot></slot></div>`;

  @prop({ reflect: true }) accessor selection: TreeSelectionMode = 'single';
  @prop({ type: Boolean, reflect: true }) accessor checkable = false;
  @prop({ reflect: true }) accessor label = 'Tree';

  #base!: HTMLDivElement;
  #slot!: HTMLSlotElement;

  /** Returns values of all currently selected tree items. */
  get selectedValues(): string[] {
    return this.#allItems()
      .filter((item) => item.selected)
      .map((item) => item.value || item.label);
  }

  /** Returns values of all currently checked tree items. */
  get checkedValues(): string[] {
    return this.#allItems()
      .filter((item) => item.checked)
      .map((item) => item.value || item.label);
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;

    this.#slot.addEventListener('slotchange', () => this.#syncTree());
    this.addEventListener('k-tree-structure-change', (e) => {
      e.stopPropagation();
      this.#syncTree();
    });

    this.addEventListener('k-tree-item-toggle', (e) => {
      const detail = (e as CustomEvent<{ item: KTreeItem }>).detail;
      if (!detail?.item) return;
      e.stopPropagation();
      this.#toggleItem(detail.item);
    });

    this.addEventListener('k-tree-item-select', (e) => {
      const detail = (e as CustomEvent<{ item: KTreeItem }>).detail;
      if (!detail?.item) return;
      e.stopPropagation();
      this.#selectItem(detail.item);
    });

    this.addEventListener('k-tree-item-check', (e) => {
      const detail = (e as CustomEvent<{ item: KTreeItem }>).detail;
      if (!detail?.item) return;
      e.stopPropagation();
      this.#toggleCheck(detail.item);
    });

    this.addEventListener('keydown', (e) => this.#onKeyDown(e));
  }

  protected override update(_changed: PropertyValues): void {
    this.#base.setAttribute('aria-label', this.label || 'Tree');
    this.#base.setAttribute(
      'aria-multiselectable',
      this.selection === 'multiple' ? 'true' : 'false',
    );
    this.#syncTree();
  }

  #topItems(): KTreeItem[] {
    return [...this.children].filter((el): el is KTreeItem => el instanceof KTreeItem);
  }

  #allItems(): KTreeItem[] {
    return [...this.querySelectorAll('k-tree-item')].filter(
      (el): el is KTreeItem => el instanceof KTreeItem,
    );
  }

  #visibleItems(): KTreeItem[] {
    const out: KTreeItem[] = [];
    const walk = (nodes: KTreeItem[]): void => {
      for (const node of nodes) {
        if (node.hidden) continue;
        out.push(node);
        if (node.expanded) {
          walk(node.childItems);
        }
      }
    };
    walk(this.#topItems());
    return out;
  }

  #syncTree(): void {
    const walk = (nodes: KTreeItem[], level: number): void => {
      for (const node of nodes) {
        node.setLevel(level);
        node.showCheckbox = this.checkable;
        walk(node.childItems, level + 1);
        if (this.checkable) {
          const enabledChildren = node.childItems.filter((c) => !c.disabled);
          if (enabledChildren.length > 0) {
            const allChecked = enabledChildren.every((c) => c.checked && !c.indeterminate);
            const anyChecked = enabledChildren.some((c) => c.checked || c.indeterminate);
            node.checked = allChecked;
            node.indeterminate = !allChecked && anyChecked;
          }
        }
      }
    };
    walk(this.#topItems(), 0);
    this.#syncTabIndex();
  }

  #syncTabIndex(focused?: KTreeItem): void {
    const visible = this.#visibleItems().filter((i) => !i.disabled);
    const active =
      (focused && visible.includes(focused) ? focused : null) ??
      visible.find((i) => i.selected) ??
      visible[0] ??
      null;
    for (const item of this.#allItems()) {
      item.setRowTabIndex(item === active ? 0 : -1);
    }
  }

  #toggleItem(item: KTreeItem): void {
    if (item.disabled || !item.isBranch) return;
    const next = !item.expanded;
    item.expanded = next;
    if (next && item.lazy && item.childItems.length === 0 && !item.loading) {
      item.loading = true;
      emit<TreeLoadDetail>(this, 'k-tree-load', { value: item.value || item.label, item });
    }
    this.#syncTabIndex(item);
  }

  #selectItem(item: KTreeItem): void {
    if (item.disabled) return;
    this.#syncTabIndex(item);
    if (this.selection === 'none') return;

    if (this.selection === 'single') {
      for (const node of this.#allItems()) {
        node.selected = node === item;
      }
    } else {
      item.selected = !item.selected;
    }

    emit<TreeSelectDetail>(this, 'k-tree-select', {
      selectedValues: this.selectedValues,
      item,
    });
  }

  #toggleCheck(item: KTreeItem): void {
    if (item.disabled) return;
    const next = !item.checked;
    this.#setCheckedRecursive(item, next);
    this.#recomputeAncestors(item.parentItem);
    emit<TreeCheckDetail>(this, 'k-tree-check', {
      checkedValues: this.checkedValues,
      item,
    });
  }

  #setCheckedRecursive(node: KTreeItem, checked: boolean): void {
    if (node.disabled) return;
    node.checked = checked;
    node.indeterminate = false;
    for (const child of node.childItems) {
      this.#setCheckedRecursive(child, checked);
    }
  }

  #recomputeAncestors(ancestor: KTreeItem | null): void {
    let curr = ancestor;
    while (curr) {
      const enabledChildren = curr.childItems.filter((c) => !c.disabled);
      if (enabledChildren.length > 0) {
        const allChecked = enabledChildren.every((c) => c.checked && !c.indeterminate);
        const anyChecked = enabledChildren.some((c) => c.checked || c.indeterminate);
        curr.checked = allChecked;
        curr.indeterminate = !allChecked && anyChecked;
      }
      curr = curr.parentItem;
    }
  }

  #onKeyDown(event: KeyboardEvent): void {
    const visible = this.#visibleItems().filter((i) => !i.disabled);
    if (visible.length === 0) return;

    const path = event.composedPath();
    const current = visible.find((item) => path.includes(item));
    if (!current) return;

    const idx = visible.indexOf(current);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = visible[Math.min(visible.length - 1, idx + 1)]!;
      this.#syncTabIndex(next);
      next.focusRow();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = visible[Math.max(0, idx - 1)]!;
      this.#syncTabIndex(prev);
      prev.focusRow();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.#syncTabIndex(visible[0]!);
      visible[0]!.focusRow();
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = visible[visible.length - 1]!;
      this.#syncTabIndex(last);
      last.focusRow();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (current.isBranch && !current.expanded) {
        this.#toggleItem(current);
      } else if (current.expanded) {
        const firstChild = current.childItems.find((c) => !c.disabled && !c.hidden);
        if (firstChild) {
          this.#syncTabIndex(firstChild);
          firstChild.focusRow();
        }
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (current.isBranch && current.expanded) {
        this.#toggleItem(current);
      } else if (current.parentItem && !current.parentItem.disabled) {
        this.#syncTabIndex(current.parentItem);
        current.parentItem.focusRow();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.#selectItem(current);
    } else if (event.key === ' ') {
      event.preventDefault();
      if (this.checkable) this.#toggleCheck(current);
      else this.#selectItem(current);
    }
  }
}
