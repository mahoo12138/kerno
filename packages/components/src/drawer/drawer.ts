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
import { animate, fadeIn, fadeOut, type MotionHandle } from '@kerno/effects/motion';
import { getIcon } from '@kerno/primitives/icon';
import { drawerStyles } from './drawer.styles.js';

export type DrawerPlacement = 'right' | 'left' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';
export type DrawerCloseSource = 'escape' | 'backdrop' | 'close-button';

export interface DrawerRequestCloseDetail {
  source: DrawerCloseSource;
}

const ENTER_FROM: Record<DrawerPlacement, string> = {
  right: 'translate3d(100%, 0, 0)',
  left: 'translate3d(-100%, 0, 0)',
  top: 'translate3d(0, -100%, 0)',
  bottom: 'translate3d(0, 100%, 0)',
};

/**
 * Edge-anchored slide-over drawer coordinated by `overlayManager` and browser
 * Top Layer (`enterTopLayer`) with focus trapping, scroll locking, directional
 * motion, and optional Acrylic frosted glass.
 *
 * @tag k-drawer
 *
 * @slot - Main scrollable drawer content.
 * @slot header - Optional rich header (overrides `label`).
 * @slot footer - Bottom action row.
 *
 * @csspart backdrop - Modal backdrop overlay.
 * @csspart panel - Slide-over panel (`role="dialog"`).
 * @csspart header - Header bar.
 * @csspart title - Heading element.
 * @csspart close-button - Dismiss button.
 * @csspart body - Scrollable body area.
 * @csspart footer - Footer container.
 *
 * @fires k-open - Fired when the drawer opens.
 * @fires k-close - Fired when the drawer closes.
 * @fires k-request-close - Cancelable event fired when the user attempts to close.
 */
export class KDrawer extends KernoElement {
  static override styles = drawerStyles;
  static override template = /* html */ `<div class="overlay"><div part="backdrop" class="backdrop" aria-hidden="true"></div><div part="panel" class="panel" role="dialog" tabindex="-1"><header part="header" class="header"><h2 part="title" class="title"><slot name="header"></slot><span class="title-fallback"></span></h2><button part="close-button" class="close-btn" type="button" aria-label="Close"></button></header><div part="body" class="body"><slot></slot></div><footer part="footer" class="footer"><slot name="footer"></slot></footer></div></div>`;

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

  readonly #overlayId = uniqueId('k-drawer');
  readonly #titleId = uniqueId('k-drawer-title');

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
      this.#playEnter();
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

  #playEnter(): void {
    const from = ENTER_FROM[this.placement] ?? ENTER_FROM.right;
    animate(this.#panel, [{ transform: from }, { transform: 'translate3d(0, 0, 0)' }], {
      id: 'drawer-slide',
      duration: 'slow',
      easing: 'decelerate',
    });
  }

  #playExit(): void {
    const to = ENTER_FROM[this.placement] ?? ENTER_FROM.right;
    this.#overlay.classList.add('closing');
    const anims: MotionHandle[] = [
      animate(this.#panel, [{ transform: 'translate3d(0, 0, 0)' }, { transform: to }], {
        id: 'drawer-slide',
        duration: 'normal',
        easing: 'accelerate',
      }),
    ];
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
