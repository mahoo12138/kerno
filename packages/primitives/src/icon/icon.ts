import { KernoElement, prop, type PropertyValues } from '@kerno/core';
import { iconStyles } from './icon.styles.js';
import { getIcon, onIconRegistered } from './registry.js';

export type IconSize = 'sm' | 'md' | 'lg' | (string & {});

/**
 * Unified vector icon component. Renders a named icon from the registry or
 * custom slotted `<svg>` content.
 *
 * @tag k-icon
 *
 * @slot - Optional custom `<svg>` element overriding `name`.
 *
 * @csspart base - Outer icon wrapper.
 * @csspart svg - Rendered `<svg>` element when using `name`.
 *
 * @cssprop --k-icon-size
 * @cssprop --k-icon-color
 */
export class KIcon extends KernoElement {
  static override styles = iconStyles;
  static override template = /* html */ `<span part="base" class="base"><slot></slot><span class="glyph"></span></span>`;

  /** Registered icon name (e.g. `'check'`, `'search'`, `'close'`). */
  @prop({ reflect: true }) accessor name = '';

  /**Preset size (`'sm' | 'md' | 'lg'`) or raw CSS length (e.g. `'24px'`). */
  @prop({ reflect: true }) accessor size: IconSize = '';

  /** Accessible label. When empty, the icon is treated as decorative (`aria-hidden="true"`). */
  @prop({ reflect: true }) accessor label = '';

  /** Continuously rotates the icon. */
  @prop({ type: Boolean, reflect: true }) accessor spin = false;

  #glyph!: HTMLSpanElement;
  #slot!: HTMLSlotElement;
  #unsubscribe: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#unsubscribe = onIconRegistered((registeredName) => {
      if (registeredName === this.name) this.#renderGlyph();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  protected override setup(): void {
    this.#glyph = this.renderRoot.querySelector('.glyph') as HTMLSpanElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    this.#slot.addEventListener('slotchange', () => {
      this.#glyph.hidden = this.#slot.assignedElements().length > 0;
    });
  }

  protected override update(changed: PropertyValues): void {
    if (changed.has('name')) {
      this.#renderGlyph();
    }
    if (changed.has('size')) {
      if (this.size && this.size !== 'sm' && this.size !== 'md' && this.size !== 'lg') {
        this.style.setProperty('--_size', this.size);
      } else {
        this.style.removeProperty('--_size');
      }
    }
    if (changed.has('label')) {
      if (this.label) {
        this.setAttribute('role', 'img');
        this.setAttribute('aria-label', this.label);
        this.removeAttribute('aria-hidden');
      } else {
        this.removeAttribute('role');
        this.removeAttribute('aria-label');
        this.setAttribute('aria-hidden', 'true');
      }
    }
  }

  #renderGlyph(): void {
    const raw = this.name ? getIcon(this.name) : undefined;
    if (!raw) {
      this.#glyph.innerHTML = '';
      return;
    }
    if (raw.startsWith('<svg')) {
      this.#glyph.innerHTML = raw;
      this.#glyph.firstElementChild?.setAttribute('part', 'svg');
    } else {
      this.#glyph.innerHTML = `<svg part="svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${raw}</svg>`;
    }
  }
}
