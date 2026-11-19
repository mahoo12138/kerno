import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { navItemStyles, navStyles } from './navigation.styles.js';

export type NavOrientation = 'horizontal' | 'vertical';

export interface NavSelectDetail {
  value: string;
  item: KNavItem;
}

/**
 * Navigation item inside `<k-nav>`.
 *
 * @tag k-nav-item
 *
 * @slot - Navigation label.
 * @slot prefix - Leading icon.
 * @slot suffix - Trailing badge or counter.
 *
 * @csspart base - Inner button.
 * @csspart prefix - Prefix wrapper.
 * @csspart label - Label wrapper.
 * @csspart suffix - Suffix wrapper.
 */
export class KNavItem extends KernoElement {
  static override styles = navItemStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="base" class="base" type="button"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><span part="label" class="label"><slot></slot></span><span part="suffix" class="suffix"><slot name="suffix"></slot></span></button>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor href = '';
  @prop({ type: Boolean, reflect: true }) accessor active = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  #base!: HTMLButtonElement;

  override connectedCallback(): void {
    super.connectedCallback();
    const nav = this.closest('k-nav');
    if (nav instanceof KNav) nav.notifyItemsChanged();
  }

  override click(): void {
    if (this.#base) this.#base.click();
    else super.click();
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLButtonElement;
    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('slot[name]')) {
      const sync = (): void => {
        slot.parentElement?.classList.toggle('has-content', slot.assignedNodes().length > 0);
      };
      slot.addEventListener('slotchange', sync);
      sync();
    }
  }

  protected override update(_changed: PropertyValues): void {
    this.#base.disabled = this.disabled;
    if (this.active) {
      this.#base.setAttribute('aria-current', 'page');
    } else {
      this.#base.removeAttribute('aria-current');
    }
  }
}

/**
 * Accessible navigation bar (`<nav>`) managing active `<k-nav-item>` state and
 * arrow-key focus movement.
 *
 * @tag k-nav
 *
 * @slot - `<k-nav-item>` elements.
 *
 * @csspart base - Inner `<nav>` element.
 *
 * @fires k-nav-select - Fired when a navigation item is selected (`detail: { value, item }`).
 */
export class KNav extends KernoElement {
  static override styles = navStyles;
  static override template = /* html */ `<nav part="base" class="base"><slot></slot></nav>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor orientation: NavOrientation = 'horizontal';
  @prop({ reflect: true }) accessor label = 'Navigation';

  #nav!: HTMLElement;

  constructor() {
    super();
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  getItems(): KNavItem[] {
    return [...this.querySelectorAll('k-nav-item')].filter(
      (el): el is KNavItem => el instanceof KNavItem,
    );
  }

  notifyItemsChanged(): void {
    if (!this.hasUpdated) return;
    this.#syncItems();
  }

  protected override setup(): void {
    this.#nav = this.renderRoot.querySelector('.base') as HTMLElement;
    const slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    slot.addEventListener('slotchange', () => this.#syncItems());
  }

  protected override update(_changed: PropertyValues): void {
    this.#nav.setAttribute('aria-label', this.label);
    this.#syncItems();
  }

  #syncItems(): void {
    const items = this.getItems();
    if (!this.value) {
      const preActive = items.find((i) => i.active && !i.disabled);
      if (preActive) this.value = preActive.value;
    }
    for (const item of items) {
      item.active = item.value !== '' && item.value === this.value;
    }
  }

  #onClick = (event: MouseEvent): void => {
    const path = event.composedPath();
    const item = path.find(
      (n): n is KNavItem => n instanceof KNavItem && n.closest('k-nav') === this,
    );
    if (!item || item.disabled) return;
    this.value = item.value;
    this.#syncItems();
    emit<NavSelectDetail>(this, 'k-nav-select', { value: item.value, item });
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const path = event.composedPath();
    const current = path.find(
      (n): n is KNavItem => n instanceof KNavItem && n.closest('k-nav') === this,
    );
    if (!current) return;

    const enabled = this.getItems().filter((i) => !i.disabled);
    if (enabled.length === 0) return;

    const idx = enabled.indexOf(current);
    const nextKey = this.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const prevKey = this.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

    let target: KNavItem | undefined;
    if (event.key === nextKey) {
      target = enabled[(idx + 1) % enabled.length];
    } else if (event.key === prevKey) {
      target = enabled[(idx - 1 + enabled.length) % enabled.length];
    } else if (event.key === 'Home') {
      target = enabled[0];
    } else if (event.key === 'End') {
      target = enabled[enabled.length - 1];
    }

    if (target) {
      event.preventDefault();
      target.focus();
    }
  };
}
