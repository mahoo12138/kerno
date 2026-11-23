import {
  getActiveElement,
  overlayManager,
  uniqueId,
  type ReactiveController,
  type ReactiveControllerHost,
} from '@kerno/core';

export type NativeDialogMode = 'modal' | 'non-modal';
export type NativeDialogCloseSource = 'escape' | 'backdrop';
/** What a `sync()` call changed, from the host's point of view. */
export type NativeDialogTransition = 'opened' | 'closed' | null;

export interface NativeDialogConfig {
  getDialog(): HTMLDialogElement | null | undefined;
  /** Whether Escape (and platform close requests such as the Android back gesture) may close. */
  closeOnEscape(): boolean;
  /** Whether a click on the modal backdrop may close. */
  closeOnBackdrop(): boolean;
  /** The user asked to close; the host decides (e.g. via a cancelable event) and updates state. */
  onRequestClose(source: NativeDialogCloseSource): void;
  /** The browser closed the dialog on its own; the host must reflect that it is closed. */
  onForcedClose(): void;
}

/**
 * Drives a native `<dialog>` inside a host's shadow root.
 *
 * - Modal mode uses `showModal()`: top layer, inert page (for assistive
 *   technology too), Tab contained by the browser, focus restored on close.
 * - The dialog is registered with `overlayManager`, so Escape first closes
 *   Kerno overlays opened inside it, and page scrolling is locked while modal.
 *   Escape is always intercepted, so the browser never closes the dialog
 *   behind the host's back; `closeOnEscape()` decides whether it closes.
 * - Backdrop clicks count only when the pointer is pressed *and* released on
 *   the backdrop, so a text selection dragged out of the panel does not close it.
 * - Moving the host in the document keeps the dialog open.
 *
 * Call `sync()` from the host's `update()` with the wanted mode.
 */
export class NativeDialogController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #config: NativeDialogConfig;
  readonly #overlayId = uniqueId('k-native-dialog');
  #dialog: HTMLDialogElement | null = null;
  #mode: NativeDialogMode | null = null;
  /** Closed only because the host left the document; re-shown when it returns. */
  #suspended = false;
  #previousFocus: HTMLElement | null = null;
  #pointerDownOnBackdrop = false;

  constructor(host: ReactiveControllerHost & HTMLElement, config: NativeDialogConfig) {
    this.#host = host;
    this.#config = config;
    host.addController(this);
  }

  /** How the dialog is currently shown; `null` while closed. */
  get mode(): NativeDialogMode | null {
    return this.#mode;
  }

  hostConnected(): void {
    // Let the host re-show a dialog that was closed when it was removed from the document.
    if (this.#suspended) this.#host.requestUpdate();
  }

  hostDisconnected(): void {
    if (this.#mode === null) return;
    this.#close(false, true);
    this.#suspended = true;
  }

  /** Shows, hides or re-shows the dialog so it matches `desired` (`null` = closed). */
  sync(desired: NativeDialogMode | null): NativeDialogTransition {
    const dialog = this.#bind();
    if (!dialog) return null;
    const wanted = this.#host.isConnected ? desired : null;

    if (this.#suspended) {
      if (desired === null) {
        this.#suspended = false;
        this.#previousFocus = null;
        return 'closed';
      }
      if (wanted === null) return null;
      this.#suspended = false;
      this.#open(dialog, wanted, this.#previousFocus);
      return this.#mode === null ? 'closed' : null;
    }

    if (wanted === this.#mode) {
      if (this.#mode === 'non-modal') {
        overlayManager.update(this.#overlayId, { closeOnEscape: this.#config.closeOnEscape() });
      }
      return null;
    }
    const wasOpen = this.#mode !== null;
    const preserveFocus = wanted !== null ? this.#previousFocus : null;
    // `showModal()` cannot upgrade an open non-modal dialog: close, then re-open.
    if (wasOpen) this.#close(wanted === null, wanted !== null);
    if (wanted !== null) this.#open(dialog, wanted, preserveFocus);
    const isOpen = this.#mode !== null;
    if (wasOpen === isOpen) return null;
    return isOpen ? 'opened' : 'closed';
  }

  /** Resolves once the dialog's own CSS transitions (entry or exit) have finished. */
  settled(): Promise<void> {
    const dialog = this.#dialog;
    if (!dialog || typeof dialog.getAnimations !== 'function') return Promise.resolve();
    const running = dialog.getAnimations().map((a) => a.finished.catch(() => undefined));
    return Promise.all(running).then(() => undefined);
  }

  #bind(): HTMLDialogElement | null {
    const dialog = this.#config.getDialog() ?? null;
    if (!dialog || dialog === this.#dialog) return dialog;
    this.#dialog = dialog;

    // A click on `::backdrop` targets the <dialog> itself, outside its border box.
    dialog.addEventListener('pointerdown', (event) => {
      this.#pointerDownOnBackdrop = this.#isOnBackdrop(event);
    });
    dialog.addEventListener('click', (event) => {
      const onBackdrop = this.#pointerDownOnBackdrop && this.#isOnBackdrop(event);
      this.#pointerDownOnBackdrop = false;
      if (onBackdrop && this.#config.closeOnBackdrop()) this.#config.onRequestClose('backdrop');
    });

    // Close requests that bypass `overlayManager`, e.g. the Android back gesture.
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (this.#config.closeOnEscape()) this.#config.onRequestClose('escape');
    });

    // The browser may still close the dialog itself. `close` fires asynchronously,
    // so skip it after our own closes and when the dialog was re-opened since.
    dialog.addEventListener('close', () => {
      if (this.#mode === null || dialog.open) return;
      this.#mode = null;
      this.#previousFocus = null;
      overlayManager.remove(this.#overlayId, false);
      this.#config.onForcedClose();
    });
    return dialog;
  }

  #open(
    dialog: HTMLDialogElement,
    mode: NativeDialogMode,
    preservedFocus: HTMLElement | null = null,
  ): void {
    const active = preservedFocus ?? getActiveElement();
    try {
      if (mode === 'modal') dialog.showModal();
      else dialog.show();
    } catch {
      // Not connected, or already open in another mode elsewhere.
      return;
    }
    this.#previousFocus = active instanceof HTMLElement ? active : null;
    this.#mode = mode;
    overlayManager.add({
      id: this.#overlayId,
      content: dialog,
      lockScroll: mode === 'modal',
      // The native dialog moves, contains and restores focus.
      trapFocus: false,
      restoreFocus: false,
      // Modal dialogs always intercept Escape so the browser never closes them behind the host's back.
      closeOnEscape: mode === 'modal' ? true : this.#config.closeOnEscape(),
      // Backdrop clicks are detected on the <dialog> itself.
      closeOnOutsideClick: false,
      onRequestClose: (reason) => {
        if (reason === 'escape' && this.#config.closeOnEscape()) {
          this.#config.onRequestClose('escape');
        }
      },
    });
  }

  #close(restoreFocus: boolean, keepPreviousFocus = false): void {
    const dialog = this.#dialog;
    const previous = this.#previousFocus;
    if (!keepPreviousFocus) this.#previousFocus = null;
    this.#mode = null;
    overlayManager.remove(this.#overlayId, false);
    dialog?.close();
    if (!restoreFocus || !previous?.isConnected) return;
    // Browsers restore focus on close; cover those that leave it on <body> or inside.
    const active = getActiveElement();
    const stranded =
      !active ||
      active === document.body ||
      this.#host.contains(active) ||
      Boolean(this.#host.shadowRoot?.contains(active));
    if (stranded) previous.focus();
  }

  #isOnBackdrop(event: MouseEvent): boolean {
    const dialog = this.#dialog;
    if (this.#mode !== 'modal' || !dialog || event.target !== dialog) return false;
    const r = dialog.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    return x < r.left || x > r.right || y < r.top || y > r.bottom;
  }
}
