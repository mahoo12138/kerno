import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
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

/**
 * Structured data table with sortable columns, custom cell renderers and empty
 * state fallback.
 *
 * @tag k-table
 *
 * @csspart wrapper - Bordered table container.
 * @csspart table - Native `<table>`.
 * @csspart thead - Native `<thead>`.
 * @csspart tbody - Native `<tbody>`.
 *
 * @fires k-sort-change - Fired when a sortable column header is clicked.
 */
export class KTable<
  T extends Record<string, unknown> = Record<string, unknown>,
> extends KernoElement {
  static override styles = tableStyles;
  static override template = /* html */ `<div part="wrapper" class="wrapper"><table part="table"><thead part="thead"></thead><tbody part="tbody"></tbody></table></div>`;

  @prop({ attribute: false }) accessor columns: readonly TableColumn<T>[] = [];
  @prop({ attribute: false }) accessor data: readonly T[] = [];
  @prop({ reflect: true, attribute: 'sort-key' }) accessor sortKey = '';
  @prop({ reflect: true, attribute: 'sort-direction' }) accessor sortDirection: SortDirection =
    null;
  @prop({ type: Boolean, reflect: true }) accessor striped = false;
  @prop({ reflect: true, attribute: 'empty-text' }) accessor emptyText = 'No records found';

  #thead!: HTMLTableSectionElement;
  #tbody!: HTMLTableSectionElement;

  protected override setup(): void {
    this.#thead = this.renderRoot.querySelector('thead') as HTMLTableSectionElement;
    this.#tbody = this.renderRoot.querySelector('tbody') as HTMLTableSectionElement;
  }

  protected override update(_changed: PropertyValues): void {
    this.#renderHead();
    this.#renderBody();
  }

  #renderHead(): void {
    this.#thead.innerHTML = '';
    const tr = document.createElement('tr');
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

  #renderBody(): void {
    this.#tbody.innerHTML = '';
    const rows = this.#sortedData();
    if (rows.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = Math.max(1, this.columns.length);
      td.className = 'empty';
      td.textContent = this.emptyText;
      tr.append(td);
      this.#tbody.append(tr);
      return;
    }

    rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
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

  #sortedData(): readonly T[] {
    if (!this.sortKey || !this.sortDirection) return this.data;
    const key = this.sortKey;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...this.data].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
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
