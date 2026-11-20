import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { paginationStyles } from './pagination.styles.js';

export type PaginationSize = 'sm' | 'md' | 'lg';
export type PaginationToken = number | 'ellipsis-start' | 'ellipsis-end';

export interface PageChangeDetail {
  page: number;
  pageSize: number;
}

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/**
 * Pure pagination window solver that collapses long page spans with ellipses
 * while never replacing a single page with an ellipsis.
 */
export function computePaginationRange(
  page: number,
  totalPages: number,
  siblingCount = 1,
  boundaryCount = 1,
): PaginationToken[] {
  const total = Math.max(1, Math.floor(totalPages));
  const current = Math.min(total, Math.max(1, Math.floor(page)));
  const sibling = Math.max(0, Math.floor(siblingCount));
  const boundary = Math.max(0, Math.floor(boundaryCount));

  const maxUncollapsed = boundary * 2 + sibling * 2 + 3;
  if (total <= maxUncollapsed) {
    return range(1, total);
  }

  const startPages = range(1, Math.min(boundary, total));
  const endPages = range(Math.max(total - boundary + 1, boundary + 1), total);

  const siblingsStart = Math.max(
    Math.min(current - sibling, total - boundary - sibling * 2 - 1),
    boundary + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(current + sibling, boundary + sibling * 2 + 2),
    endPages.length > 0 ? endPages[0]! - 2 : total - 1,
  );

  const items: PaginationToken[] = [...startPages];

  if (siblingsStart > boundary + 2) {
    items.push('ellipsis-start');
  } else if (boundary + 1 < total - boundary) {
    items.push(boundary + 1);
  }

  items.push(...range(siblingsStart, siblingsEnd));

  if (siblingsEnd < total - boundary - 1) {
    items.push('ellipsis-end');
  } else if (total - boundary > boundary) {
    items.push(total - boundary);
  }

  items.push(...endPages);
  return items;
}

/**
 * Accessible Fluent 1 pagination bar with smart ellipsis collapsing, chromatic
 * Accent active page styling, optional first/last jump buttons, and range summary.
 *
 * @tag k-pagination
 *
 * @csspart nav - Outer `<nav aria-label="Pagination">` landmark.
 * @csspart list - Page controls list.
 * @csspart button - Individual page or navigation button.
 * @csspart summary - Optional item range readout (`show-total`).
 *
 * @fires k-page-change - Fired when the user selects a different page (`{ page, pageSize }`).
 */
export class KPagination extends KernoElement {
  static override styles = paginationStyles;
  static override template = /* html */ `<nav part="nav" class="nav" aria-label="Pagination"><ul part="list" class="list"></ul><span part="summary" class="summary" hidden></span></nav>`;

  /** Current 1-based page number. */
  @prop({ type: Number, reflect: true }) accessor page = 1;
  /** Total item count (used with `page-size` to compute total pages when `> 0`). */
  @prop({ type: Number, reflect: true }) accessor total = 0;
  /** Explicit total page count (takes precedence when `total` is `0`). */
  @prop({ type: Number, attribute: 'total-pages', reflect: true }) accessor totalPages = 1;
  /** Items per page when computing page count from `total`. */
  @prop({ type: Number, attribute: 'page-size', reflect: true }) accessor pageSize = 10;
  @prop({ type: Number, attribute: 'sibling-count', reflect: true }) accessor siblingCount = 1;
  @prop({ type: Number, attribute: 'boundary-count', reflect: true }) accessor boundaryCount = 1;
  @prop({ reflect: true }) accessor size: PaginationSize = 'md';
  /** Renders First (`«`) and Last (`»`) edge jump buttons. */
  @prop({ type: Boolean, attribute: 'show-edges', reflect: true }) accessor showEdges = false;
  /** Renders an item/page summary readout next to the controls. */
  @prop({ type: Boolean, attribute: 'show-total', reflect: true }) accessor showTotal = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  #list!: HTMLUListElement;
  #summary!: HTMLSpanElement;

  /** Effective number of pages derived from `total`/`pageSize` or `totalPages`. */
  get pageCount(): number {
    if (this.total > 0) {
      const size = Math.max(1, Math.floor(this.pageSize) || 1);
      return Math.max(1, Math.ceil(this.total / size));
    }
    return Math.max(1, Math.floor(this.totalPages) || 1);
  }

  protected override setup(): void {
    this.#list = this.renderRoot.querySelector('.list') as HTMLUListElement;
    this.#summary = this.renderRoot.querySelector('.summary') as HTMLSpanElement;

    this.#list.addEventListener('click', (event) => {
      if (this.disabled) return;
      const btn = (event.target as Element | null)?.closest<HTMLButtonElement>('button[data-page]');
      if (!btn || btn.disabled) return;
      const target = Number(btn.dataset.page);
      if (!Number.isFinite(target)) return;
      this.#goTo(target);
    });
  }

  protected override update(_changed: PropertyValues): void {
    const count = this.pageCount;
    const current = Math.min(count, Math.max(1, Math.floor(this.page) || 1));
    if (current !== this.page) {
      this.page = current;
    }

    const tokens = computePaginationRange(current, count, this.siblingCount, this.boundaryCount);
    const frag = document.createDocumentFragment();

    if (this.showEdges) {
      frag.append(
        this.#createNavItem(
          1,
          'First page',
          `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevrons-left') ?? ''}</svg>`,
          this.disabled || current <= 1,
        ),
      );
    }

    frag.append(
      this.#createNavItem(
        Math.max(1, current - 1),
        'Previous page',
        `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevron-left') ?? ''}</svg>`,
        this.disabled || current <= 1,
      ),
    );

    for (const entry of tokens) {
      const li = document.createElement('li');
      if (typeof entry === 'number') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn';
        btn.setAttribute('part', 'button');
        btn.dataset.page = String(entry);
        btn.textContent = String(entry);
        btn.disabled = this.disabled;
        btn.setAttribute('aria-label', `Page ${entry}`);
        if (entry === current) {
          btn.setAttribute('aria-current', 'page');
        }
        li.append(btn);
      } else {
        const span = document.createElement('span');
        span.className = 'ellipsis';
        span.setAttribute('aria-hidden', 'true');
        span.innerHTML = `<svg viewBox="0 0 16 16">${getIcon('more-horizontal') ?? ''}</svg>`;
        li.append(span);
      }
      frag.append(li);
    }

    frag.append(
      this.#createNavItem(
        Math.min(count, current + 1),
        'Next page',
        `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevron-right') ?? ''}</svg>`,
        this.disabled || current >= count,
      ),
    );

    if (this.showEdges) {
      frag.append(
        this.#createNavItem(
          count,
          'Last page',
          `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevrons-right') ?? ''}</svg>`,
          this.disabled || current >= count,
        ),
      );
    }

    this.#list.replaceChildren(frag);

    if (this.showTotal) {
      this.#summary.hidden = false;
      if (this.total > 0) {
        const size = Math.max(1, Math.floor(this.pageSize) || 1);
        const start = (current - 1) * size + 1;
        const end = Math.min(this.total, current * size);
        this.#summary.textContent = `${start}–${end} of ${this.total}`;
      } else {
        this.#summary.textContent = `Page ${current} of ${count}`;
      }
    } else {
      this.#summary.hidden = true;
    }
  }

  #createNavItem(targetPage: number, label: string, svg: string, disabled: boolean): HTMLLIElement {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.setAttribute('part', 'button');
    btn.dataset.page = String(targetPage);
    btn.setAttribute('aria-label', label);
    btn.disabled = disabled;
    btn.innerHTML = svg;
    li.append(btn);
    return li;
  }

  #goTo(nextPage: number): void {
    const count = this.pageCount;
    const clamped = Math.min(count, Math.max(1, Math.floor(nextPage)));
    if (clamped === this.page) return;
    this.page = clamped;
    emit<PageChangeDetail>(this, 'k-page-change', {
      page: clamped,
      pageSize: Math.max(1, Math.floor(this.pageSize) || 1),
    });
  }
}
