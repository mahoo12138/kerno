import { KernoElement, emit, prop, uniqueId, type PropertyValues } from '@kerno/core';
import { tabPanelStyles, tabStyles, tabsStyles } from './tabs.styles.js';

export type TabsOrientation = 'horizontal' | 'vertical';
export type TabsActivation = 'auto' | 'manual';

export interface TabChangeDetail {
  name: string;
}

/**
 * Individual tab trigger inside `<k-tabs>`.
 *
 * @tag k-tab
 *
 * @slot - Tab label content.
 *
 * @csspart base - Inner tab button (`role="tab"`).
 */
export class KTab extends KernoElement {
  static override styles = tabStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="base" class="base" type="button" role="tab" aria-selected="false"><slot></slot></button>`;

  /** Name of the associated `<k-tab-panel name="...">`. */
  @prop({ reflect: true }) accessor panel = '';
  @prop({ type: Boolean, reflect: true }) accessor active = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  #base!: HTMLButtonElement;
  #rovingTabIndex: 0 | -1 = -1;

  override connectedCallback(): void {
    if (!this.hasAttribute('slot')) {
      this.setAttribute('slot', 'nav');
    }
    if (!this.id) {
      this.id = uniqueId('k-tab');
    }
    super.connectedCallback();
    const tabs = this.closest('k-tabs');
    if (tabs instanceof KTabs) tabs.notifyTabsChanged();
  }

  override click(): void {
    if (this.#base) this.#base.click();
    else super.click();
  }

  setRovingTabIndex(index: 0 | -1): void {
    this.#rovingTabIndex = index;
    if (this.#base) {
      this.#base.tabIndex = this.disabled ? -1 : index;
    }
  }

  setAriaControls(panelId: string): void {
    this.#base?.setAttribute('aria-controls', panelId);
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLButtonElement;
  }

  protected override update(_changed: PropertyValues): void {
    this.#base.disabled = this.disabled;
    this.#base.tabIndex = this.disabled ? -1 : this.#rovingTabIndex;
    this.#base.setAttribute('aria-selected', this.active ? 'true' : 'false');
  }
}

/**
 * Tab content panel inside `<k-tabs>`.
 *
 * @tag k-tab-panel
 *
 * @slot - Panel content.
 *
 * @csspart base - Panel container.
 */
export class KTabPanel extends KernoElement {
  static override styles = tabPanelStyles;
  static override template = /* html */ `<div part="base" class="base"><slot></slot></div>`;

  /** Panel identifier matched by `<k-tab panel="...">`. */
  @prop({ reflect: true }) accessor name = '';
  @prop({ type: Boolean, reflect: true }) accessor active = false;

  override connectedCallback(): void {
    if (!this.id) {
      this.id = uniqueId('k-tab-panel');
    }
    this.setAttribute('role', 'tabpanel');
    super.connectedCallback();
    const tabs = this.closest('k-tabs');
    if (tabs instanceof KTabs) tabs.notifyTabsChanged();
  }

  protected override update(_changed: PropertyValues): void {
    this.hidden = !this.active;
  }
}

/**
 * Accessible tabs container managing `<k-tab>` and `<k-tab-panel>` pairing,
 * roving tabindex and arrow-key navigation.
 *
 * @tag k-tabs
 *
 * @slot nav - `<k-tab>` elements (assigned automatically when `<k-tab>` connects).
 * @slot - `<k-tab-panel>` elements.
 *
 * @csspart tablist - The `role="tablist"` bar.
 * @csspart panels - The panels container.
 *
 * @fires k-tab-change - Fired when the active tab changes (`detail: { name }`).
 */
export class KTabs extends KernoElement {
  static override styles = tabsStyles;
  static override template = /* html */ `<div part="tablist" class="tablist" role="tablist"><slot name="nav"></slot></div><div part="panels" class="panels"><slot></slot></div>`;

  /** Active panel name. */
  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor orientation: TabsOrientation = 'horizontal';
  @prop({ reflect: true }) accessor activation: TabsActivation = 'auto';

  #tablist!: HTMLDivElement;

  constructor() {
    super();
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  getTabs(): KTab[] {
    return [...this.querySelectorAll('k-tab')].filter((el): el is KTab => el instanceof KTab);
  }

  getPanels(): KTabPanel[] {
    return [...this.querySelectorAll('k-tab-panel')].filter(
      (el): el is KTabPanel => el instanceof KTabPanel,
    );
  }

  notifyTabsChanged(): void {
    if (!this.hasUpdated) return;
    this.#syncTabs();
  }

  selectTab(name: string, fromUser = false): void {
    const tab = this.getTabs().find((t) => t.panel === name);
    if (!tab || tab.disabled) return;
    const changed = this.value !== name;
    this.value = name;
    this.#syncTabs();
    if (fromUser && changed) {
      emit<TabChangeDetail>(this, 'k-tab-change', { name });
    }
  }

  protected override setup(): void {
    this.#tablist = this.renderRoot.querySelector('.tablist') as HTMLDivElement;
    for (const slot of this.renderRoot.querySelectorAll('slot')) {
      slot.addEventListener('slotchange', () => this.#syncTabs());
    }
  }

  protected override update(_changed: PropertyValues): void {
    this.#tablist.setAttribute('aria-orientation', this.orientation);
    this.#syncTabs();
  }

  #syncTabs(): void {
    const tabs = this.getTabs();
    const panels = this.getPanels();
    if (tabs.length === 0) return;

    // Default to first enabled tab if value is unset.
    if (!this.value) {
      const preActive = tabs.find((t) => t.active && !t.disabled) ?? tabs.find((t) => !t.disabled);
      if (preActive) {
        this.value = preActive.panel;
      }
    }

    for (const tab of tabs) {
      const isActive = tab.panel !== '' && tab.panel === this.value;
      tab.active = isActive;
      tab.setRovingTabIndex(isActive ? 0 : -1);
      const panel = panels.find((p) => p.name === tab.panel);
      if (panel) {
        tab.setAriaControls(panel.id);
        panel.setAttribute('aria-labelledby', tab.id);
      }
    }

    for (const panel of panels) {
      panel.active = panel.name !== '' && panel.name === this.value;
    }
  }

  #onClick = (event: MouseEvent): void => {
    const path = event.composedPath();
    const tab = path.find((n): n is KTab => n instanceof KTab && n.closest('k-tabs') === this);
    if (tab && !tab.disabled) {
      this.selectTab(tab.panel, true);
    }
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const path = event.composedPath();
    const currentTab = path.find(
      (n): n is KTab => n instanceof KTab && n.closest('k-tabs') === this,
    );
    if (!currentTab) return;

    const enabled = this.getTabs().filter((t) => !t.disabled);
    if (enabled.length === 0) return;

    const idx = enabled.indexOf(currentTab);
    const nextKey = this.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const prevKey = this.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

    let target: KTab | undefined;
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
      if (this.activation === 'auto') {
        this.selectTab(target.panel, true);
      }
    }
  };
}
