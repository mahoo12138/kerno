import {
  KernoElement,
  LocalizeController,
  emit,
  isServer,
  prop,
  type PropertyValues,
} from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { dataGridStyles } from './data-grid.styles.js';
import { computeVirtualWindow, type VirtualWindow } from './virtual.js';

export type DataGridSortDirection = 'asc' | 'desc' | null;

export interface DataGridColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  /** Initial width in px (defaults to flexible `1fr` when omitted). */
  width?: number;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  resizable?: boolean;
  render?: (value: unknown, row: T, index: number) => string | Node;
}

export interface DataGridSelectionDetail<T = Record<string, unknown>> {
  selectedKeys: string[];
  selectedRows: T[];
}

export interface DataGridRowClickDetail<T = Record<string, unknown>> {
  row: T;
  key: string;
  index: number;
}

/**
 * High-performance virtualized data grid supporting 10,000+ rows at 60fps,
 * pointer column resizing, sorting, live global filtering, multi-row checkbox
 * selection, and custom cell renderers.
 *
 * @tag k-data-grid
 *
 * @csspart viewport - Scrollable virtualized viewport.
 * @csspart header - Sticky column header row.
 * @csspart body - Virtualized row container.
 * @csspart footer - Status bar displaying total, filtered, selected, and DOM-rendered row counts.
 *
 * @fires k-sort-change - Fired when column sorting changes.
 * @fires k-selection-change - Fired when selected rows change.
 * @fires k-row-click - Fired when a row is clicked.
 * @fires k-column-resize - Fired when a column width is dragged.
 */
export class KDataGrid<
  T extends Record<string, unknown> = Record<string, unknown>,
> extends KernoElement {
  static override styles = dataGridStyles;
  static override template = /* html */ `<div part="viewport" class="viewport" role="grid"><div part="header" class="header" role="row"></div><div part="body" class="body" role="rowgroup"></div><div class="empty" hidden></div></div><div part="footer" class="footer"><span class="footer-stats"></span><span class="footer-virtual"></span></div>`;
  readonly #localize = new LocalizeController(this);

  @prop({ attribute: false }) accessor columns: readonly DataGridColumn<T>[] = [];
  @prop({ attribute: false }) accessor data: readonly T[] = [];
  @prop({ type: Number, attribute: 'row-height', reflect: true }) accessor rowHeight = 40;
  @prop({ type: Number, reflect: true }) accessor overscan = 6;
  @prop({ type: Boolean, reflect: true }) accessor selectable = false;
  @prop({ reflect: true, attribute: 'row-key' }) accessor rowKey = 'id';
  @prop({ attribute: false }) accessor selectedKeys: readonly string[] = [];
  @prop({ reflect: true }) accessor filter = '';
  @prop({ reflect: true, attribute: 'sort-key' }) accessor sortKey = '';
  @prop({ reflect: true, attribute: 'sort-direction' })
  accessor sortDirection: DataGridSortDirection = null;
  @prop({ type: Boolean, reflect: true }) accessor striped = true;
  @prop({ type: Boolean, attribute: 'show-footer', reflect: true }) accessor showFooter = true;
  @prop({ reflect: true, attribute: 'empty-text' }) accessor emptyText = '';

  #viewport!: HTMLDivElement;
  #header!: HTMLDivElement;
  #body!: HTMLDivElement;
  #empty!: HTMLDivElement;
  #footer!: HTMLDivElement;
  #footerStats!: HTMLSpanElement;
  #footerVirtual!: HTMLSpanElement;

  #colWidths = new Map<string, number>();
  #processed: { row: T; key: string }[] = [];
  #lastWindow: VirtualWindow = { startIndex: -1, endIndex: -1, totalHeight: 0, renderedCount: 0 };
  #scrollRaf = 0;
  #ro: ResizeObserver | null = null;

  /** Returns the currently rendered virtual slice metadata. */
  get virtualWindow(): VirtualWindow {
    return this.#lastWindow;
  }

  get selectedRows(): T[] {
    const sel = new Set(this.selectedKeys);
    return this.data.filter((row, i) => sel.has(this.#keyOf(row, i)));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!isServer && typeof ResizeObserver === 'function' && this.#viewport && !this.#ro) {
      this.#ro = new ResizeObserver(() => this.#renderVirtualSlice(true));
      this.#ro.observe(this.#viewport);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.#scrollRaf) cancelAnimationFrame(this.#scrollRaf);
    this.#scrollRaf = 0;
    this.#ro?.disconnect();
    this.#ro = null;
  }

  protected override setup(): void {
    this.#viewport = this.renderRoot.querySelector('.viewport') as HTMLDivElement;
    this.#header = this.renderRoot.querySelector('.header') as HTMLDivElement;
    this.#body = this.renderRoot.querySelector('.body') as HTMLDivElement;
    this.#empty = this.renderRoot.querySelector('.empty') as HTMLDivElement;
    this.#footer = this.renderRoot.querySelector('.footer') as HTMLDivElement;
    this.#footerStats = this.renderRoot.querySelector('.footer-stats') as HTMLSpanElement;
    this.#footerVirtual = this.renderRoot.querySelector('.footer-virtual') as HTMLSpanElement;

    this.#viewport.addEventListener(
      'scroll',
      () => {
        if (this.#scrollRaf) return;
        this.#scrollRaf = requestAnimationFrame(() => {
          this.#scrollRaf = 0;
          this.#renderVirtualSlice(false);
        });
      },
      { passive: true },
    );

    if (!isServer && typeof ResizeObserver === 'function') {
      this.#ro = new ResizeObserver(() => this.#renderVirtualSlice(true));
      this.#ro.observe(this.#viewport);
    }
  }

  protected override update(changed: PropertyValues): void {
    if (
      changed.has('data') ||
      changed.has('columns') ||
      changed.has('filter') ||
      changed.has('sortKey') ||
      changed.has('sortDirection') ||
      changed.has('rowKey')
    ) {
      this.#processed = this.#computeRows();
      if (changed.has('filter') && this.#viewport) {
        this.#viewport.scrollTop = 0;
      }
    }

    this.#syncGridTemplate();
    this.#renderHeader();
    this.#renderVirtualSlice(true);
    this.#footer.hidden = !this.showFooter;
  }

  #keyOf(row: T, index: number): string {
    const raw = this.rowKey && row[this.rowKey];
    return raw != null && String(raw) !== '' ? String(raw) : String(index);
  }

  #computeRows(): { row: T; key: string }[] {
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

  #syncGridTemplate(): void {
    const parts: string[] = [];
    if (this.selectable) parts.push('40px');
    for (const col of this.columns) {
      const custom = this.#colWidths.get(col.key);
      if (custom !== undefined) {
        parts.push(`${custom}px`);
      } else if (col.width !== undefined) {
        parts.push(`${col.width}px`);
      } else {
        parts.push(`minmax(${col.minWidth ?? 110}px, 1fr)`);
      }
    }
    this.#viewport.style.setProperty('--_grid-cols', parts.join(' ') || '1fr');
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

  #renderHeader(): void {
    const frag = document.createDocumentFragment();

    if (this.selectable) {
      const cell = document.createElement('div');
      cell.className = 'th select-cell';
      cell.setAttribute('role', 'columnheader');
      const sel = new Set(this.selectedKeys);
      let selVisible = 0;
      for (const item of this.#processed) {
        if (sel.has(item.key)) selVisible++;
      }
      const allSelected = this.#processed.length > 0 && selVisible === this.#processed.length;
      const someSelected = selVisible > 0 && !allSelected;
      cell.append(
        this.#makeCheckbox(
          allSelected ? 'true' : someSelected ? 'mixed' : 'false',
          this.#localize.term('selectAllRows'),
          () => {
            const next = new Set(this.selectedKeys);
            if (allSelected) {
              for (const item of this.#processed) next.delete(item.key);
            } else {
              for (const item of this.#processed) next.add(item.key);
            }
            this.#commitSelection([...next]);
          },
        ),
      );
      frag.append(cell);
    }

    for (const col of this.columns) {
      const th = document.createElement('div');
      th.className = 'th';
      th.setAttribute('role', 'columnheader');
      if (col.align === 'right') th.classList.add('align-right');
      else if (col.align === 'center') th.classList.add('align-center');

      const titleSpan = document.createElement('span');
      titleSpan.textContent = col.title;
      th.append(titleSpan);

      if (col.sortable) {
        th.classList.add('sortable');
        th.tabIndex = 0;
        const active = this.sortKey === col.key && this.sortDirection !== null;
        th.setAttribute(
          'aria-sort',
          active ? (this.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none',
        );
        if (active) {
          const ind = document.createElement('span');
          ind.className = 'sort-ind';
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

      if (col.resizable !== false) {
        const resizer = document.createElement('span');
        resizer.className = 'resizer';
        resizer.addEventListener('click', (e) => e.stopPropagation());
        resizer.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startW = th.getBoundingClientRect().width;
          const minW = col.minWidth ?? 72;
          resizer.classList.add('active');

          const onMove = (ev: PointerEvent): void => {
            const nextW = Math.max(minW, Math.round(startW + (ev.clientX - startX)));
            this.#colWidths.set(col.key, nextW);
            this.#syncGridTemplate();
          };
          const onUp = (): void => {
            resizer.classList.remove('active');
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            const finalW = this.#colWidths.get(col.key);
            if (finalW !== undefined) {
              emit(this, 'k-column-resize', { key: col.key, width: finalW });
            }
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        });
        th.append(resizer);
      }

      frag.append(th);
    }

    this.#header.replaceChildren(frag);
  }

  #renderVirtualSlice(force: boolean): void {
    const total = this.#processed.length;
    const rowH = Math.max(16, Math.floor(this.rowHeight) || 40);
    const viewH = this.#viewport.clientHeight || 380;
    const win = computeVirtualWindow(this.#viewport.scrollTop, viewH, total, rowH, this.overscan);

    if (
      !force &&
      win.startIndex === this.#lastWindow.startIndex &&
      win.endIndex === this.#lastWindow.endIndex &&
      win.totalHeight === this.#lastWindow.totalHeight
    ) {
      return;
    }

    this.#lastWindow = win;
    this.#viewport.setAttribute('aria-rowcount', String(total));

    if (total === 0) {
      this.#body.style.height = '0px';
      this.#body.innerHTML = '';
      this.#empty.hidden = false;
      this.#empty.textContent = this.emptyText || this.#localize.term('noFilteredRows');
      this.#syncFooter();
      return;
    }

    this.#empty.hidden = true;
    this.#body.style.height = `${win.totalHeight}px`;

    const sel = new Set(this.selectedKeys);
    const frag = document.createDocumentFragment();

    for (let i = win.startIndex; i < win.endIndex; i++) {
      const entry = this.#processed[i]!;
      const rowEl = document.createElement('div');
      rowEl.className = 'row';
      rowEl.setAttribute('role', 'row');
      rowEl.setAttribute('aria-rowindex', String(i + 1));
      rowEl.dataset.even = i % 2 === 1 ? 'true' : 'false';
      rowEl.style.height = `${rowH}px`;
      rowEl.style.transform = `translateY(${i * rowH}px)`;

      const isSelected = this.selectable && sel.has(entry.key);
      if (isSelected) rowEl.classList.add('selected');

      rowEl.addEventListener('click', () => {
        emit<DataGridRowClickDetail<T>>(this, 'k-row-click', {
          row: entry.row,
          key: entry.key,
          index: i,
        });
      });

      if (this.selectable) {
        const td = document.createElement('div');
        td.className = 'td select-cell';
        td.setAttribute('role', 'gridcell');
        const rowLabel = this.#localize.term('selectRow', String(i + 1));
        td.append(
          this.#makeCheckbox(isSelected ? 'true' : 'false', rowLabel, () => {
            const next = new Set(this.selectedKeys);
            if (next.has(entry.key)) next.delete(entry.key);
            else next.add(entry.key);
            this.#commitSelection([...next]);
          }),
        );
        rowEl.append(td);
      }

      for (const col of this.columns) {
        const td = document.createElement('div');
        td.className = 'td';
        td.setAttribute('role', 'gridcell');
        if (col.align === 'right') td.classList.add('align-right');
        else if (col.align === 'center') td.classList.add('align-center');

        const raw = entry.row[col.key];
        if (col.render) {
          const rendered = col.render(raw, entry.row, i);
          if (rendered instanceof Node) td.append(rendered);
          else td.textContent = String(rendered ?? '');
        } else {
          td.textContent = raw == null ? '' : String(raw);
        }
        rowEl.append(td);
      }

      frag.append(rowEl);
    }

    this.#body.replaceChildren(frag);
    this.#syncFooter();
  }

  #syncFooter(): void {
    const total = this.data.length;
    const filtered = this.#processed.length;
    const selCount = this.selectedKeys.length;
    const t = this.#localize;
    const base =
      filtered === total
        ? t.term('rowCount', t.number(total))
        : t.term('filteredRowCount', t.number(filtered), t.number(total));
    this.#footerStats.textContent =
      this.selectable && selCount > 0 ? t.term('selectedRows', base, t.number(selCount)) : base;
    const rendered = t.number(this.#lastWindow.renderedCount);
    this.#footerVirtual.textContent = t.term('renderedRows', rendered);
  }

  #commitSelection(nextKeys: string[]): void {
    this.selectedKeys = nextKeys;
    emit<DataGridSelectionDetail<T>>(this, 'k-selection-change', {
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
    emit(this, 'k-sort-change', { key: this.sortKey, direction: this.sortDirection });
  }
}
