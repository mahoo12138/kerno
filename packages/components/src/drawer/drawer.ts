import {
  AriaForwardingController,
  KernoElement,
  LocalizeController,
  emit,
  prop,
  setLabels,
  type PropertyValues,
} from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { NativeDialogController } from '../dialog/native-dialog.js';
import { drawerStyles } from './drawer.styles.js';

export type DrawerPlacement = 'right' | 'left' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';
export type DrawerCloseSource = 'escape' | 'backdrop' | 'close-button';

export interface DrawerRequestCloseDetail {
  source: DrawerCloseSource;
}

/**
 * Edge-anchored slide-over drawer built on the native `<dialog>` element.
 *
 * Modal drawers open with `showModal()` (top layer, inert page, focus
 * restored on close); `overlayManager` coordinates Escape with nested Kerno
 * overlays and locks page scrolling. The slide motion is a CSS transition
 * driven by motion tokens. `right` / `left` follow the writing direction.
 *
 * @tag k-drawer
 *
 * @slot - Main scrollable drawer content.
 * @slot header - Optional rich header (overrides `label`).
 * @slot footer - Bottom action row.
 *
 * @csspart panel - The native `<dialog>` element.
 * @csspart header - Header bar.
 * @csspart title - Heading element.
 * @csspart close-button - Dismiss button.
 * @csspart body - Scrollable body area.
 * @csspart footer - Footer container.
 *
 * @cssprop --k-drawer-size
 * @cssprop --k-drawer-bg
 * @cssprop --k-drawer-backdrop-bg - Background of the modal backdrop (`::backdrop`).
 * @cssprop --k-drawer-padding
 * @cssprop --k-drawer-border-color
 *
 * @fires k-open - Fired when the drawer opens.
 * @fires k-close - Fired when the drawer closes.
 * @fires k-request-close - Cancelable event fired when the user attempts to close.
 */
export class KDrawer extends KernoElement {
  static override styles = drawerStyles;
  static override template = /* html */ `<dialog part="panel" class="panel"><header part="header" class="header"><h2 part="title" class="title" id="title"><slot name="header"></slot><span class="title-fallback"></span></h2><button part="close-button" class="close-btn" type="button" aria-label="Close"></button></header><div part="body" class="body"><slot></slot></div><footer part="footer" class="footer"><slot name="footer"></slot></footer></dialog>`;
  readonly #localize = new LocalizeController(this);

  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ reflect: true }) accessor placement: DrawerPlacement = 'right';
  @prop({ reflect: true }) accessor size: DrawerSize = 'md';
  @prop({ reflect: true }) accessor label = '';
  @prop({ type: Boolean, reflect: true }) accessor modal = true;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, attribute: 'close-on-escape', reflect: true })
  accessor closeOnEscape = true;
  @prop({ type: Boolean, attribute: 'close-on-backdrop', reflect: true })
  accessor closeOnBackdrop = true;

  #panel!: HTMLDialogElement;
  #titleFallback!: HTMLSpanElement;
  #headerSlot!: HTMLSlotElement;

  readonly #native = new NativeDialogController(this, {
    getDialog: () => this.#panel,
    closeOnEscape: () => this.closeOnEscape,
    closeOnBackdrop: () => this.closeOnBackdrop,
    onRequestClose: (source) => this.#requestClose(source),
    onForcedClose: () => {
      this.open = false;
      emit(this, 'k-close');
    },
  });

  constructor() {
    super();
    // Host aria-label / aria-labelledby / aria-describedby override the visible title.
    new AriaForwardingController(this, {
      getTarget: () => this.#panel,
      getInternalLabelId: () => (this.#hasTitle() ? 'title' : null),
    });
  }

  show(): void {
    this.open = true;
  }

  close(): void {
    this.open = false;
  }

  protected override setup(): void {
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDialogElement;
    this.#titleFallback = this.renderRoot.querySelector('.title-fallback') as HTMLSpanElement;
    this.#headerSlot = this.renderRoot.querySelector('slot[name="header"]') as HTMLSlotElement;
    const closeBtn = this.renderRoot.querySelector('.close-btn') as HTMLButtonElement;

    closeBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;
    closeBtn.addEventListener('click', () => this.#requestClose('close-button'));

    this.#headerSlot.addEventListener('slotchange', () => {
      this.#titleFallback.hidden = this.#headerSlot.assignedNodes().length > 0;
      this.requestUpdate();
    });

    const footerSlot = this.renderRoot.querySelector('slot[name="footer"]') as HTMLSlotElement;
    const syncFooter = (): void => {
      footerSlot.parentElement?.classList.toggle(
        'has-content',
        footerSlot.assignedNodes().length > 0,
      );
    };
    footerSlot.addEventListener('slotchange', syncFooter);
    syncFooter();
  }

  protected override update(_changed: PropertyValues): void {
    // Localized labels; re-applied whenever the language changes.
    setLabels(this.renderRoot, [['.close-btn', this.#localize.term('close')]]);
    this.#titleFallback.textContent = this.label;
    const transition = this.#native.sync(this.open ? (this.modal ? 'modal' : 'non-modal') : null);
    if (transition === 'opened') emit(this, 'k-open');
    else if (transition === 'closed') emit(this, 'k-close');
  }

  #hasTitle(): boolean {
    if (this.label.trim().length > 0) return true;
    return (this.#headerSlot?.assignedNodes().length ?? 0) > 0;
  }

  #requestClose(source: DrawerCloseSource): void {
    const allowed = emit<DrawerRequestCloseDetail>(
      this,
      'k-request-close',
      { source },
      { cancelable: true },
    );
    if (allowed) {
      this.open = false;
    }
  }
}
