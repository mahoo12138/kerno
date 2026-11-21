import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { copyButtonStyles } from './copy-button.styles.js';

export type CopyButtonVariant = 'standard' | 'accent' | 'subtle';
export type CopyButtonSize = 'sm' | 'md' | 'lg';

export interface CopyEventDetail {
  value: string;
  copied: boolean;
}

/**
 * Clipboard copy button with automatic `copied` feedback state, timed reset,
 * Fluent status styling, and graceful fallback when `navigator.clipboard` is
 * unavailable.
 *
 * @tag k-copy-button
 *
 * @slot - Optional custom label overriding `label` / `copied-label`.
 * @csspart button - Inner interactive copy button.
 *
 * @fires k-copy - Fired after copying (`{ value, copied }`).
 */
export class KCopyButton extends KernoElement {
  static override styles = copyButtonStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="button" class="btn" type="button"><span class="icon" aria-hidden="true"></span><span class="text"><slot></slot></span></button>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ type: Number, reflect: true }) accessor timeout = 2000;
  @prop({ reflect: true }) accessor label = 'Copy';
  @prop({ attribute: 'copied-label', reflect: true }) accessor copiedLabel = 'Copied';
  @prop({ reflect: true }) accessor variant: CopyButtonVariant = 'standard';
  @prop({ reflect: true }) accessor size: CopyButtonSize = 'md';
  @prop({ type: Boolean, reflect: true }) accessor copied = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;

  #btn!: HTMLButtonElement;
  #iconEl!: HTMLSpanElement;
  #textEl!: HTMLSpanElement;
  #slot!: HTMLSlotElement;
  #timer: ReturnType<typeof setTimeout> | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  /** Programmatically copies `value` to the clipboard and activates `copied` state. */
  async copy(): Promise<boolean> {
    if (this.disabled) return false;
    let ok = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.value);
        ok = true;
      }
    } catch {
      ok = false;
    }

    if (!ok && typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = this.value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      ta.remove();
    }

    if (this.#timer !== null) clearTimeout(this.#timer);
    this.copied = true;
    const ms = Math.max(200, Number(this.timeout) || 2000);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.copied = false;
    }, ms);

    emit<CopyEventDetail>(this, 'k-copy', { value: this.value, copied: ok });
    return ok;
  }

  protected override setup(): void {
    this.#btn = this.renderRoot.querySelector('.btn') as HTMLButtonElement;
    this.#iconEl = this.renderRoot.querySelector('.icon') as HTMLSpanElement;
    this.#textEl = this.renderRoot.querySelector('.text') as HTMLSpanElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;

    this.#btn.addEventListener('click', () => {
      void this.copy();
    });
    this.#slot.addEventListener('slotchange', () => this.#syncText());
  }

  protected override update(_changed: PropertyValues): void {
    this.#btn.disabled = this.disabled;
    this.#btn.setAttribute('aria-label', this.copied ? this.copiedLabel : this.label);
    const iconName = this.copied ? 'check' : 'copy';
    this.#iconEl.innerHTML = `<svg viewBox="0 0 16 16">${getIcon(iconName) ?? ''}</svg>`;
    this.#syncText();
  }

  #syncText(): void {
    const hasSlotted = this.#slot
      .assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent?.trim().length ?? 0) > 0);
    if (!hasSlotted) {
      let fallback = this.#textEl.querySelector<HTMLSpanElement>('.fallback');
      if (!fallback) {
        fallback = document.createElement('span');
        fallback.className = 'fallback';
        this.#textEl.append(fallback);
      }
      fallback.textContent = this.copied ? this.copiedLabel : this.label;
    } else {
      this.#textEl.querySelector('.fallback')?.remove();
    }
  }
}
