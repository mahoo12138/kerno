import {
  KernoElement,
  autoPosition,
  emit,
  enterTopLayer,
  exitTopLayer,
  getActiveElement,
  overlayManager,
  prop,
  uniqueId,
  type Placement,
  type PropertyValues,
} from '@kerno/core';
import { scaleIn, scaleOut, type MotionHandle } from '@kerno/effects/motion';
import { dropdownStyles, menuItemStyles, menuStyles } from './dropdown.styles.js';

export interface MenuSelectDetail {
  value: string;
  item: KMenuItem;
}

/**
 * Interactive menu item inside `<k-menu>` or `<k-dropdown>`.
 *
 * @tag k-menu-item
 *
 * @slot - Item label.
 * @slot prefix - Leading icon.
 * @slot suffix - Trailing shortcut or badge.
 *
 * @csspart base - Inner button (`role="menuitem"`).
 * @csspart prefix - Prefix wrapper.
 * @csspart label - Label wrapper.
 * @csspart suffix - Suffix wrapper.
 *
 * @fires k-select - Bubbling event fired when the item is activated.
 */
export class KMenuItem extends KernoElement {
  static override styles = menuItemStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="base" class="base" type="button" role="menuitem"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><span part="label" class="label"><slot></slot></span><span part="suffix" class="suffix"><slot name="suffix"></slot></span></button>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  #base!: HTMLButtonElement;

  constructor() {
    super();
    this.addEventListener('click', this.#onClick, { capture: true });
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
  }

  #onClick = (event: MouseEvent): void => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    emit<MenuSelectDetail>(this, 'k-select', { value: this.value, item: this });
  };
}

function navigateMenuItems(items: KMenuItem[], key: string): boolean {
  const enabled = items.filter((item) => !item.disabled);
  if (enabled.length === 0) return false;
  const active = getActiveElement();
  const currentIdx = enabled.findIndex(
    (item) => item === active || item.shadowRoot?.contains(active),
  );

  let targetIdx = -1;
  if (key === 'ArrowDown') {
    targetIdx = (currentIdx + 1) % enabled.length;
  } else if (key === 'ArrowUp') {
    targetIdx = currentIdx <= 0 ? enabled.length - 1 : currentIdx - 1;
  } else if (key === 'Home') {
    targetIdx = 0;
  } else if (key === 'End') {
    targetIdx = enabled.length - 1;
  }

  if (targetIdx !== -1) {
    enabled[targetIdx]!.focus();
    return true;
  }
  return false;
}

/**
 * Standalone or dropdown menu container supporting WAI-ARIA keyboard navigation.
 *
 * @tag k-menu
 *
 * @slot - `<k-menu-item>` elements.
 *
 * @csspart base - Menu container (`role="menu"`).
 *
 * @fires k-select - Bubbled when a child `<k-menu-item>` is activated.
 */
export class KMenu extends KernoElement {
  static override styles = menuStyles;
  static override template = /* html */ `<div part="base" class="base" role="menu"><slot></slot></div>`;

  constructor() {
    super();
    this.addEventListener('keydown', this.#onKeyDown);
  }

  getItems(): KMenuItem[] {
    return [...this.querySelectorAll('k-menu-item')].filter(
      (el): el is KMenuItem => el instanceof KMenuItem,
    );
  }

  focusFirstItem(): void {
    const first = this.getItems().find((i) => !i.disabled);
    first?.focus();
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    if (navigateMenuItems(this.getItems(), event.key)) {
      event.preventDefault();
    }
  };
}

/**
 * Dropdown menu overlay anchored to a trigger slot, with keyboard navigation,
 * Escape/outside-click dismissal and automatic focus restoration.
 *
 * @tag k-dropdown
 *
 * @slot trigger - Trigger button or element.
 * @slot - `<k-menu-item>` elements (or a `<k-menu>`).
 *
 * @csspart trigger - Trigger wrapper.
 * @csspart panel - Floating menu panel.
 *
 * @fires k-open - Fired when the dropdown opens.
 * @fires k-close - Fired when the dropdown closes.
 * @fires k-select - Fired when a menu item is selected (`detail: { value, item }`).
 */
export class KDropdown extends KernoElement {
  static override styles = dropdownStyles;
  static override template = /* html */ `<span part="trigger" class="trigger"><slot name="trigger"></slot></span><div part="panel" class="panel" role="menu"><slot></slot></div>`;

  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ reflect: true }) accessor placement: Placement = 'bottom-start';
  @prop({ type: Number }) accessor offset = 6;
  @prop({ type: Boolean, attribute: 'close-on-select', reflect: true })
  accessor closeOnSelect = true;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;

  readonly #overlayId = uniqueId('k-dropdown');

  #triggerEl!: HTMLSpanElement;
  #triggerSlot!: HTMLSlotElement;
  #panel!: HTMLDivElement;
  #stopPositioning: (() => void) | null = null;
  #wasOpen = false;
  #exitAnim: MotionHandle | null = null;

  constructor() {
    super();
    this.addEventListener('k-select', () => {
      if (this.closeOnSelect) {
        this.open = false;
      }
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cancelExit();
    this.#cleanup(false);
    this.#wasOpen = false;
  }

  show(): void {
    this.open = true;
  }

  hide(): void {
    this.open = false;
  }

  toggle(): void {
    this.open = !this.open;
  }

  getItems(): KMenuItem[] {
    return [...this.querySelectorAll('k-menu-item')].filter(
      (el): el is KMenuItem => el instanceof KMenuItem,
    );
  }

  protected override setup(): void {
    this.#triggerEl = this.renderRoot.querySelector('.trigger') as HTMLSpanElement;
    this.#triggerSlot = this.renderRoot.querySelector('slot[name="trigger"]') as HTMLSlotElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;

    this.#triggerEl.addEventListener('click', () => this.toggle());
    this.#triggerEl.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.open = true;
      }
    });

    this.#panel.addEventListener('keydown', (event) => {
      // If items are placed directly inside <k-dropdown> without a <k-menu> wrapper, handle arrow keys here.
      if (!this.querySelector('k-menu') && navigateMenuItems(this.getItems(), event.key)) {
        event.preventDefault();
      }
    });

    this.#triggerSlot.addEventListener('slotchange', () => this.#syncAria());
  }

  protected override update(_changed: PropertyValues): void {
    this.#syncAria();

    if (this.open && !this.#wasOpen) {
      this.#wasOpen = true;
      this.#cancelExit();
      enterTopLayer(this.#panel);
      const anchor = this.#getAnchorElement();
      this.#stopPositioning = autoPosition(anchor, this.#panel, {
        placement: this.placement,
        offset: this.offset,
      });
      overlayManager.add({
        id: this.#overlayId,
        content: this.#panel,
        trigger: this.#triggerEl,
        trapFocus: false,
        lockScroll: false,
        restoreFocus: true,
        closeOnEscape: true,
        closeOnOutsideClick: true,
        onRequestClose: () => {
          this.open = false;
        },
      });
      scaleIn(this.#panel, { duration: 'fast' });
      queueMicrotask(() => {
        if (!this.open) return;
        const first = this.getItems().find((i) => !i.disabled);
        first?.focus();
      });
      emit(this, 'k-open');
    } else if (!this.open && this.#wasOpen) {
      this.#wasOpen = false;
      overlayManager.remove(this.#overlayId);
      emit(this, 'k-close');
      this.#playExit();
    }
  }

  #getAnchorElement(): Element {
    return this.#triggerSlot.assignedElements({ flatten: true })[0] ?? this.#triggerEl;
  }

  #syncAria(): void {
    const target = this.#triggerSlot.assignedElements({ flatten: true })[0];
    if (target) {
      target.setAttribute('aria-expanded', this.open ? 'true' : 'false');
      target.setAttribute('aria-haspopup', 'menu');
    }
  }

  #playExit(): void {
    this.#panel.classList.add('closing');
    const anim = scaleOut(this.#panel, { duration: 'fast' });
    this.#exitAnim = anim;
    void anim.finished.then(() => {
      if (this.open) return;
      this.#panel.classList.remove('closing');
      this.#stopPositioning?.();
      this.#stopPositioning = null;
      exitTopLayer(this.#panel);
      this.#exitAnim = null;
    });
  }

  #cancelExit(): void {
    this.#exitAnim?.cancel();
    this.#exitAnim = null;
    this.#panel?.classList.remove('closing');
  }

  #cleanup(restoreFocus = true): void {
    this.#stopPositioning?.();
    this.#stopPositioning = null;
    exitTopLayer(this.#panel);
    overlayManager.remove(this.#overlayId, restoreFocus);
  }
}
