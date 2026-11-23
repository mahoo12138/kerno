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
import { dialogStyles } from './dialog.styles.js';
import { NativeDialogController } from './native-dialog.js';

export type DialogCloseSource = 'escape' | 'backdrop' | 'close-button';

export interface DialogRequestCloseDetail {
  source: DialogCloseSource;
}

/**
 * Modal or non-modal dialog built on the native `<dialog>` element.
 *
 * Modal dialogs open with `showModal()`: they render in the top layer, make the
 * rest of the page inert (for pointer, keyboard *and* assistive technology),
 * and restore focus when closed. `overlayManager` coordinates Escape with other
 * Kerno overlays (a select or popover opened inside the dialog closes first)
 * and locks page scrolling. Entry and exit motion are CSS transitions driven by
 * motion tokens, so `prefers-reduced-motion` disables them.
 *
 * @tag k-dialog
 *
 * @slot - Dialog body content.
 * @slot header - Optional rich title content (overrides `label`).
 * @slot footer - Action buttons in the dialog footer.
 *
 * @csspart panel - The native `<dialog>` element.
 * @csspart header - Header row.
 * @csspart title - Heading element.
 * @csspart close-button - Close button (`aria-label="Close"`).
 * @csspart body - Scrollable body area.
 * @csspart footer - Footer container.
 *
 * @cssprop --k-dialog-width
 * @cssprop --k-dialog-max-width
 * @cssprop --k-dialog-radius
 * @cssprop --k-dialog-bg
 * @cssprop --k-dialog-backdrop-bg - Background of the modal backdrop (`::backdrop`).
 * @cssprop --k-dialog-padding
 *
 * @fires k-open - Fired when the dialog opens.
 * @fires k-close - Fired when the dialog closes.
 * @fires k-request-close - Cancelable event fired when the user attempts to dismiss the dialog.
 */
export class KDialog extends KernoElement {
  static override styles = dialogStyles;
  static override template = /* html */ `<dialog part="panel" class="panel"><header part="header" class="header"><h2 part="title" class="title" id="title"><slot name="header"></slot><span class="title-fallback"></span></h2><button part="close-button" class="close-btn" type="button" aria-label="Close"></button></header><div part="body" class="body"><slot></slot></div><footer part="footer" class="footer"><slot name="footer"></slot></footer></dialog>`;
  readonly #localize = new LocalizeController(this);

  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ reflect: true }) accessor label = '';
  @prop({ type: Boolean, reflect: true }) accessor modal = true;
  @prop({ type: Boolean, attribute: 'close-on-escape', reflect: true })
  accessor closeOnEscape = true;
  @prop({ type: Boolean, attribute: 'close-on-backdrop', reflect: true })
  accessor closeOnBackdrop = true;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;

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

  #requestClose(source: DialogCloseSource): void {
    const allowed = emit<DialogRequestCloseDetail>(
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
