import {
  KernoElement,
  emit,
  enterTopLayer,
  exitTopLayer,
  overlayManager,
  prop,
  uniqueId,
  type PropertyValues,
} from '@kerno/core';
import { fadeIn, fadeOut, scaleIn, scaleOut, type MotionHandle } from '@kerno/effects/motion';
import { getIcon } from '@kerno/primitives/icon';
import { dialogStyles } from './dialog.styles.js';

export type DialogCloseSource = 'escape' | 'backdrop' | 'close-button';

export interface DialogRequestCloseDetail {
  source: DialogCloseSource;
}

/**
 * Modal or non-modal dialog coordinated by `overlayManager` with focus trapping,
 * scroll locking, Escape/backdrop dismissal, and token-driven entry motion.
 *
 * @tag k-dialog
 *
 * @slot - Dialog body content.
 * @slot header - Optional rich title content (overrides `label`).
 * @slot footer - Action buttons in the dialog footer.
 *
 * @csspart backdrop - Modal backdrop overlay.
 * @csspart panel - Dialog container (`role="dialog"`).
 * @csspart header - Header row.
 * @csspart title - Heading element.
 * @csspart close-button - Close button (`aria-label="Close"`).
 * @csspart body - Scrollable body area.
 * @csspart footer - Footer container.
 *
 * @fires k-open - Fired when the dialog opens.
 * @fires k-close - Fired when the dialog closes.
 * @fires k-request-close - Cancelable event fired when the user attempts to dismiss the dialog.
 */
export class KDialog extends KernoElement {
  static override styles = dialogStyles;
  static override template = /* html */ `<div class="overlay"><div part="backdrop" class="backdrop" aria-hidden="true"></div><div part="panel" class="panel" role="dialog" tabindex="-1"><header part="header" class="header"><h2 part="title" class="title"><slot name="header"></slot><span class="title-fallback"></span></h2><button part="close-button" class="close-btn" type="button" aria-label="Close"></button></header><div part="body" class="body"><slot></slot></div><footer part="footer" class="footer"><slot name="footer"></slot></footer></div></div>`;

  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ reflect: true }) accessor label = '';
  @prop({ type: Boolean, reflect: true }) accessor modal = true;
  @prop({ type: Boolean, attribute: 'close-on-escape', reflect: true })
  accessor closeOnEscape = true;
  @prop({ type: Boolean, attribute: 'close-on-backdrop', reflect: true })
  accessor closeOnBackdrop = true;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;

  readonly #overlayId = uniqueId('k-dialog');
  readonly #titleId = uniqueId('k-dialog-title');

  #overlay!: HTMLDivElement;
  #backdrop!: HTMLDivElement;
  #panel!: HTMLDivElement;
  #titleEl!: HTMLHeadingElement;
  #titleFallback!: HTMLSpanElement;
  #closeBtn!: HTMLButtonElement;
  #headerSlot!: HTMLSlotElement;
  #wasOpen = false;
  #exitAnims: MotionHandle[] = [];

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cancelExit();
    exitTopLayer(this.#overlay);
    overlayManager.remove(this.#overlayId, false);
    this.#wasOpen = false;
  }

  show(): void {
    this.open = true;
  }

  close(): void {
    this.open = false;
  }

  protected override setup(): void {
    this.#overlay = this.renderRoot.querySelector('.overlay') as HTMLDivElement;
    this.#backdrop = this.renderRoot.querySelector('.backdrop') as HTMLDivElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;
    this.#titleEl = this.renderRoot.querySelector('.title') as HTMLHeadingElement;
    this.#titleFallback = this.renderRoot.querySelector('.title-fallback') as HTMLSpanElement;
    this.#closeBtn = this.renderRoot.querySelector('.close-btn') as HTMLButtonElement;
    this.#headerSlot = this.renderRoot.querySelector('slot[name="header"]') as HTMLSlotElement;

    this.#titleEl.id = this.#titleId;
    this.#panel.setAttribute('aria-labelledby', this.#titleId);
    this.#closeBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;

    this.#closeBtn.addEventListener('click', () => this.#requestClose('close-button'));

    this.#headerSlot.addEventListener('slotchange', () => {
      this.#titleFallback.hidden = this.#headerSlot.assignedNodes().length > 0;
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
    this.#titleFallback.textContent = this.label;
    this.#panel.setAttribute('aria-modal', this.modal ? 'true' : 'false');

    if (this.open && !this.#wasOpen) {
      this.#wasOpen = true;
      this.#cancelExit();
      enterTopLayer(this.#overlay);
      overlayManager.add({
        id: this.#overlayId,
        content: this.#panel,
        trapFocus: this.modal,
        lockScroll: this.modal,
        restoreFocus: true,
        closeOnEscape: this.closeOnEscape,
        closeOnOutsideClick: this.closeOnBackdrop,
        onRequestClose: (reason) => {
          this.#requestClose(reason === 'escape' ? 'escape' : 'backdrop');
        },
      });
      if (this.modal) fadeIn(this.#backdrop);
      scaleIn(this.#panel);
      emit(this, 'k-open');
    } else if (!this.open && this.#wasOpen) {
      this.#wasOpen = false;
      overlayManager.remove(this.#overlayId);
      emit(this, 'k-close');
      this.#playExit();
    } else if (this.open && this.#wasOpen) {
      overlayManager.update(this.#overlayId, {
        trapFocus: this.modal,
        lockScroll: this.modal,
        closeOnEscape: this.closeOnEscape,
        closeOnOutsideClick: this.closeOnBackdrop,
      });
    }
  }

  #playExit(): void {
    this.#overlay.classList.add('closing');
    const anims: MotionHandle[] = [scaleOut(this.#panel, { duration: 'fast' })];
    if (this.modal) anims.push(fadeOut(this.#backdrop, { duration: 'fast' }));
    this.#exitAnims = anims;
    void Promise.all(anims.map((a) => a.finished)).then(() => {
      if (this.open) return;
      this.#overlay.classList.remove('closing');
      exitTopLayer(this.#overlay);
      this.#exitAnims = [];
    });
  }

  #cancelExit(): void {
    for (const anim of this.#exitAnims) anim.cancel();
    this.#exitAnims = [];
    this.#overlay?.classList.remove('closing');
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
