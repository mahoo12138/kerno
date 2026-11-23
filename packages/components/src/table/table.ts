import { KernoElement, LocalizeController, emit, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { tableStyles } from './table.styles.js';

export type SortDirection = 'asc' | 'desc' | null;

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: unknown, row: T, index: number) => string | Node;
}

export interface TableSortChangeDetail {
  key: string;
  direction: SortDirection;
}

export interface TableSelectionChangeDetail<T = Record<string, unknown>> {
  selectedKeys: string[];
  selectedRows: T[];
}

/**
 * Structured data table with sortable columns, live text filtering, multi-row
 * checkbox selection, sticky header, custom cell renderers, and empty state.
 *
 * @tag k-table
 *
 * @csspart wrapper - Bordered table container.
 * @csspart table - Native `<table>`.
 * @csspart thead - Native `<thead>`.
 * @csspart tbody - Native `<tbody>`.
 *
 * @fires k-sort-change - Fired when a sortable column header is clicked.
 * @fires k-selection-change - Fired when selected rows change (`{ selectedKeys, selectedRows }`).
 */
export class KTable<
  T extends Record<string, unknown> = Record<string, unknown>,
> extends KernoElement {
  static override styles = tableStyles;
  static override template = /* html */ `<div part="wrapper" class="wrapper"><table part="table"><thead part="thead"></thead><tbody part="tbody"></tbody></table></div>`;
  readonly #localize = new LocalizeController(this);

  @prop({ attribute: false }) accessor columns: readonly TableColumn<T>[] = [];
  @prop({ attribute: false }) accessor data: readonly T[] = [];
  @prop({ reflect: true, attribute: 'sort-key' }) accessor sortKey = '';
  @prop({ reflect: true, attribute: 'sort-direction' }) accessor sortDirection: SortDirection =
    null;
  @prop({ type: Boolean, reflect: true }) accessor striped = false;
  @prop({ type: Boolean, reflect: true }) accessor selectable = false;
  /** Property name used as stable row identifier for selection (defaults to `'id'` or row index). */
  @prop({ reflect: true, attribute: 'row-key' }) accessor rowKey = 'id';
  @prop({ attribute: false }) accessor selectedKeys: readonly string[] = [];
  /** Case-insensitive live filter query applied across column values. */
  @prop({ reflect: true }) accessor filter = '';
  @prop({ type: Boolean, reflect: true, attribute: 'sticky-header' }) accessor stickyHeader = false;
  @prop({ reflect: true, attribute: 'empty-text' }) accessor emptyText = '';

  #thead!: HTMLTableSectionElement;
  #tbody!: HTMLTableSectionElement;

  /** Returns the currently selected row objects. */
  get selectedRows(): T[] {
    const selected = new Set(this.selectedKeys);
    return this.data.filter((row, idx) => selected.has(this.#keyOf(row, idx)));
  }

  protected override setup(): void {
    this.#thead = this.renderRoot.querySelector('thead') as HTMLTableSectionElement;
    this.#tbody = this.renderRoot.querySelector('tbody') as HTMLTableSectionElement;
  }

  protected override update(_changed: PropertyValues): void {
    const rows = this.#visibleRows();
    this.#renderHead(rows);
    this.#renderBody(rows);
  }

  #keyOf(row: T, fallbackIndex: number): string {
    const k = this.rowKey && row[this.rowKey];
    return k != null && String(k) !== '' ? String(k) : String(fallbackIndex);
  }

  #visibleRows(): { row: T; key: string }[] {
    const q = this.filter.trim().toLowerCase();
    const mapped = this.data.map((row, idx) => ({ row, key: this.#keyOf(row, idx) }));

    const filtered = !q
      ? mapped
      : mapped.filter(({ row }) =>
          this.columns.some((col) => {
            const v = row[col.key];
            return v != null && String(v).toLowerCase().includes(q);
          }),
        );

    if (!this.sortKey || !this.sortDirection) return filtered;
    const key = this.sortKey;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = a.row[key];
      const vb = b.row[key];
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  #makeCheckbox(
    state: 'true' | 'false' | 'mixed',
    label: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'check-btn';
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-checked', state);
    btn.setAttribute('aria-label', label);
    btn.innerHTML =
      state === 'mixed'
        ? `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('minus') ?? ''}</svg>`
        : state === 'true'
          ? `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('check') ?? ''}</svg>`
          : '';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  #renderHead(visible: { row: T; key: string }[]): void {
    this.#thead.innerHTML = '';
    const tr = document.createElement('tr');

    if (this.selectable) {
      const th = document.createElement('th');
      th.className = 'select-col';
      const selected = new Set(this.selectedKeys);
      const selectedVisible = visible.filter((v) => selected.has(v.key)).length;
      const allSelected = visible.length > 0 && selectedVisible === visible.length;
      const someSelected = selectedVisible > 0 && !allSelected;
      const checkState = allSelected ? 'true' : someSelected ? 'mixed' : 'false';
      th.append(
        this.#makeCheckbox(checkState, this.#localize.term('selectAllRows'), () => {
          const next = new Set(this.selectedKeys);
          if (allSelected) {
            for (const v of visible) next.delete(v.key);
          } else {
            for (const v of visible) next.add(v.key);
          }
          this.#commitSelection([...next]);
        }),
      );
      tr.append(th);
    }

    for (const col of this.columns) {
      const th = document.createElement('th');
      th.textContent = col.title;
      if (col.align) th.style.textAlign = col.align;
      if (col.sortable) {
        th.classList.add('sortable');
        th.tabIndex = 0;
        const isCurrent = this.sortKey === col.key && this.sortDirection !== null;
        th.setAttribute(
          'aria-sort',
          isCurrent ? (this.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none',
        );
        if (isCurrent) {
          const ind = document.createElement('span');
          ind.className = 'sort-indicator';
          ind.textContent = this.sortDirection === 'asc' ? '▲' : '▼';
          th.append(ind);
        }
        const toggle = (): void => this.#toggleSort(col.key);
        th.addEventListener('click', toggle);
        th.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        });
      }
      tr.append(th);
    }
    this.#thead.append(tr);
  }

  #renderBody(rows: { row: T; key: string }[]): void {
    this.#tbody.innerHTML = '';
    const totalCols = Math.max(1, this.columns.length + (this.selectable ? 1 : 0));
    if (rows.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = totalCols;
      td.className = 'empty';
      td.textContent = this.emptyText || this.#localize.term('noRecords');
      tr.append(td);
      this.#tbody.append(tr);
      return;
    }

    const selected = new Set(this.selectedKeys);

    rows.forEach(({ row, key }, rowIndex) => {
      const tr = document.createElement('tr');
      const isSelected = this.selectable && selected.has(key);
      if (isSelected) tr.classList.add('selected');

      if (this.selectable) {
        const td = document.createElement('td');
        td.className = 'select-col';
        const rowLabel = this.#localize.term('selectRow', String(rowIndex + 1));
        td.append(
          this.#makeCheckbox(isSelected ? 'true' : 'false', rowLabel, () => {
            const next = new Set(this.selectedKeys);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            this.#commitSelection([...next]);
          }),
        );
        tr.append(td);
      }

      for (const col of this.columns) {
        const td = document.createElement('td');
        if (col.align) td.style.textAlign = col.align;
        const rawValue = row[col.key];
        if (col.render) {
          const rendered = col.render(rawValue, row, rowIndex);
          if (rendered instanceof Node) td.append(rendered);
          else td.textContent = String(rendered ?? '');
        } else {
          td.textContent = rawValue == null ? '' : String(rawValue);
        }
        tr.append(td);
      }
      this.#tbody.append(tr);
    });
  }

  #commitSelection(nextKeys: string[]): void {
    this.selectedKeys = nextKeys;
    emit<TableSelectionChangeDetail<T>>(this, 'k-selection-change', {
      selectedKeys: nextKeys,
      selectedRows: this.selectedRows,
    });
  }

  #toggleSort(key: string): void {
    if (this.sortKey !== key) {
      this.sortKey = key;
      this.sortDirection = 'asc';
    } else if (this.sortDirection === 'asc') {
      this.sortDirection = 'desc';
    } else if (this.sortDirection === 'desc') {
      this.sortDirection = null;
      this.sortKey = '';
    } else {
      this.sortDirection = 'asc';
    }
    emit<TableSortChangeDetail>(this, 'k-sort-change', {
      key: this.sortKey,
      direction: this.sortDirection,
    });
  }
}
