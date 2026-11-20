import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { breadcrumbItemStyles, breadcrumbStyles } from './breadcrumb.styles.js';

export interface BreadcrumbSelectDetail {
  index: number;
  href: string;
  item: KBreadcrumbItem;
}

/**
 * Single crumb inside `<k-breadcrumb>`. Automatically styled as current page
 * when last in the trail or when `current` is set.
 *
 * @tag k-breadcrumb-item
 *
 * @slot - Crumb label text (and optional leading icon).
 *
 * @csspart link - Interactive `<a>` or `<button>` element.
 * @csspart current - Static current-page label (`aria-current="page"`).
 * @csspart separator - Separator glyph shown after non-last items.
 * @csspart ellipsis - Expandable `…` overflow button shown when middle items are collapsed.
 */
export class KBreadcrumbItem extends KernoElement {
  static override styles = breadcrumbItemStyles;
  static override template = /* html */ `<a part="link" class="link"><slot></slot></a><span part="current" class="current" aria-current="page" hidden></span><span part="separator" class="sep sep-main" aria-hidden="true"></span><button part="ellipsis" class="ellipsis" type="button" aria-label="Show hidden path items" hidden></button><span class="sep sep-ellipsis" aria-hidden="true" hidden></span>`;

  @prop({ reflect: true }) accessor href = '';
  @prop({ reflect: true }) accessor target = '';
  @prop({ type: Boolean, reflect: true }) accessor current = false;

  /** Managed by parent `<k-breadcrumb>`. */
  @prop({ type: Boolean }) accessor isLast = false;
  /** Managed by parent `<k-breadcrumb>`. */
  @prop() accessor separatorText = '';
  /** Managed by parent `<k-breadcrumb>`: number of collapsed items immediately following this item. */
  @prop({ type: Number }) accessor collapsedAfter = 0;
  /** Managed by parent `<k-breadcrumb>`. */
  index = 0;

  #link!: HTMLAnchorElement;
  #currentEl!: HTMLSpanElement;
  #slot!: HTMLSlotElement;
  #sepMain!: HTMLSpanElement;
  #ellipsisBtn!: HTMLButtonElement;
  #sepEllipsis!: HTMLSpanElement;

  /** Focuses this item's interactive link. */
  focusItem(): void {
    this.#link?.focus();
  }

  protected override setup(): void {
    this.setAttribute('role', 'listitem');
    this.#link = this.renderRoot.querySelector('.link') as HTMLAnchorElement;
    this.#currentEl = this.renderRoot.querySelector('.current') as HTMLSpanElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    this.#sepMain = this.renderRoot.querySelector('.sep-main') as HTMLSpanElement;
    this.#ellipsisBtn = this.renderRoot.querySelector('.ellipsis') as HTMLButtonElement;
    this.#sepEllipsis = this.renderRoot.querySelector('.sep-ellipsis') as HTMLSpanElement;

    this.#ellipsisBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('more-horizontal') ?? ''}</svg>`;

    this.#link.addEventListener('click', (event) => {
      if (!this.href) {
        event.preventDefault();
      }
      const allowed = emit<BreadcrumbSelectDetail>(
        this,
        'k-breadcrumb-select',
        { index: this.index, href: this.href, item: this },
        { cancelable: true },
      );
      if (!allowed) event.preventDefault();
    });

    this.#ellipsisBtn.addEventListener('click', () => {
      emit(this, 'k-breadcrumb-expand', undefined, { bubbles: true, composed: true });
    });

    this.#slot.addEventListener('slotchange', () => this.#syncSlotHost());
  }

  protected override update(_changed: PropertyValues): void {
    const isCurrent = this.current || this.isLast;
    this.#syncSlotHost();

    if (isCurrent) {
      this.#link.hidden = true;
      this.#currentEl.hidden = false;
    } else {
      this.#link.hidden = false;
      this.#currentEl.hidden = true;
      if (this.href) {
        this.#link.setAttribute('href', this.href);
        this.#link.removeAttribute('role');
        this.#link.removeAttribute('tabindex');
      } else {
        this.#link.removeAttribute('href');
        this.#link.setAttribute('role', 'button');
        this.#link.tabIndex = 0;
      }
      if (this.target) this.#link.setAttribute('target', this.target);
      else this.#link.removeAttribute('target');
    }

    const sepMarkup = this.separatorText
      ? this.#escapeHtml(this.separatorText)
      : `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevron-right') ?? ''}</svg>`;

    this.#sepMain.innerHTML = sepMarkup;
    this.#sepMain.hidden = this.isLast;

    const showEllipsis = !this.isLast && this.collapsedAfter > 0;
    this.#ellipsisBtn.hidden = !showEllipsis;
    this.#ellipsisBtn.title = showEllipsis ? `Show ${this.collapsedAfter} hidden items` : '';
    this.#sepEllipsis.innerHTML = sepMarkup;
    this.#sepEllipsis.hidden = !showEllipsis;
  }

  #syncSlotHost(): void {
    const isCurrent = this.current || this.isLast;
    const targetParent = isCurrent ? this.#currentEl : this.#link;
    if (this.#slot.parentElement !== targetParent) {
      targetParent.append(this.#slot);
    }
  }

  #escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

/**
 * Semantic breadcrumb navigation trail (`<nav aria-label="Breadcrumb">`) with
 * automatic `aria-current="page"` detection, custom separators, and optional
 * `max-items` middle-path collapsing.
 *
 * @tag k-breadcrumb
 *
 * @slot - `<k-breadcrumb-item>` elements.
 *
 * @csspart nav - Outer `<nav>` landmark.
 * @csspart list - Ordered `<ol>` container.
 *
 * @fires k-breadcrumb-select - Bubbled from `<k-breadcrumb-item>` when an interactive crumb is clicked.
 */
export class KBreadcrumb extends KernoElement {
  static override styles = breadcrumbStyles;
  static override template = /* html */ `<nav part="nav" class="nav"><ol part="list" class="list"><slot></slot></ol></nav>`;

  @prop({ reflect: true }) accessor label = 'Breadcrumb';
  /** Optional custom separator text (e.g. `"/"`). Defaults to a crisp chevron-right icon. */
  @prop({ reflect: true }) accessor separator = '';
  /** Collapses middle crumbs behind an expandable `…` button when total exceeds `max-items` (`0` = disabled). */
  @prop({ type: Number, attribute: 'max-items', reflect: true }) accessor maxItems = 0;

  #nav!: HTMLElement;
  #slot!: HTMLSlotElement;
  #expanded = false;

  /** Expands any collapsed middle crumbs. */
  expand(): void {
    this.#expanded = true;
    this.#syncItems();
  }

  protected override setup(): void {
    this.#nav = this.renderRoot.querySelector('.nav') as HTMLElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    this.#slot.addEventListener('slotchange', () => this.#syncItems());

    this.addEventListener('k-breadcrumb-expand', (event) => {
      event.stopPropagation();
      this.#expanded = true;
      this.#syncItems();
      const second = this.#items()[1];
      if (second) {
        queueMicrotask(() => second.focusItem());
      }
    });
  }

  protected override update(changed: PropertyValues): void {
    this.#nav.setAttribute('aria-label', this.label || 'Breadcrumb');
    if (changed.has('maxItems')) {
      this.#expanded = false;
    }
    this.#syncItems();
  }

  #items(): KBreadcrumbItem[] {
    return this.#slot
      .assignedElements({ flatten: true })
      .filter((el): el is KBreadcrumbItem => el.tagName.toLowerCase() === 'k-breadcrumb-item');
  }

  #syncItems(): void {
    const items = this.#items();
    const total = items.length;
    const shouldCollapse = !this.#expanded && this.maxItems > 2 && total > this.maxItems;
    const trailingVisible = shouldCollapse ? this.maxItems - 1 : total;
    const hideEndIndex = shouldCollapse ? total - trailingVisible : 0;
    const collapsedCount = shouldCollapse ? Math.max(0, hideEndIndex - 1) : 0;

    items.forEach((item, index) => {
      item.index = index;
      item.isLast = index === total - 1;
      item.separatorText = this.separator;
      item.collapsedAfter = index === 0 ? collapsedCount : 0;
      const collapsed = shouldCollapse && index >= 1 && index < hideEndIndex;
      item.toggleAttribute('data-k-bc-collapsed', collapsed);
    });
  }
}
