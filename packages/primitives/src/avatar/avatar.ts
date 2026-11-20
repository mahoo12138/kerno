import { KernoElement, prop, state, type PropertyValues } from '@kerno/core';
import { ShapeOutlineController, type CornerKind } from '@kerno/effects/shape';
import { getIcon } from '../icon/registry.js';
import { avatarGroupStyles, avatarStyles } from './avatar.styles.js';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | CornerKind;
export type AvatarStatus = '' | 'online' | 'busy' | 'away' | 'offline';
export type AvatarVariant = 'neutral' | 'accent';

/** Derives 1–2 crisp initials from a display name (supports both Latin and CJK names). */
export function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = [...parts[0]!][0] ?? '';
    const last = [...parts[parts.length - 1]!][0] ?? '';
    return `${first}${last}`.toUpperCase();
  }
  const chars = [...trimmed];
  return (chars[0] ?? '').toUpperCase();
}

/**
 * User/entity avatar with graceful image-to-initials-to-icon fallback,
 * presence status indicator, and parametric `shape` clipping.
 *
 * @tag k-avatar
 *
 * @slot - Optional custom fallback content (rendered when image is absent/failed and no initials).
 *
 * @csspart base - Outer wrapper (anchors presence badge outside clip-path).
 * @csspart frame - Clipped avatar surface container.
 * @csspart image - Native `<img>` element.
 * @csspart fallback - Initials or icon fallback wrapper.
 * @csspart status - Presence indicator dot.
 */
export class KAvatar extends KernoElement {
  static override styles = avatarStyles;
  static override template = /* html */ `<span part="base" class="base"><span part="frame" class="frame"><img part="image" class="image" hidden /><span part="fallback" class="fallback"><slot></slot><span class="fallback-content"></span></span></span><span part="status" class="status" hidden></span></span>`;

  /** Image URL to display. Falls back automatically on error or when empty. */
  @prop({ reflect: true }) accessor src = '';
  /** Accessible name (also used to auto-derive initials if `initials` is unset). */
  @prop({ reflect: true }) accessor alt = '';
  /** Explicit initials override (e.g. `"AL"`). */
  @prop({ reflect: true }) accessor initials = '';
  @prop({ reflect: true }) accessor size: AvatarSize = 'md';
  /** `'circle'` (default), `'rounded'` (sharp Fluent square), or `'chamfer' | 'scallop' | 'notch'`. */
  @prop({ reflect: true }) accessor shape: AvatarShape = 'circle';
  @prop({ reflect: true }) accessor status: AvatarStatus = '';
  @prop({ reflect: true }) accessor variant: AvatarVariant = 'neutral';

  @state() accessor #imageFailed = false;
  @state() accessor #hasSlottedFallback = false;

  #base!: HTMLSpanElement;
  #frame!: HTMLSpanElement;
  #img!: HTMLImageElement;
  #fallback!: HTMLSpanElement;
  #fallbackContent!: HTMLSpanElement;
  #statusEl!: HTMLSpanElement;
  #slot!: HTMLSlotElement;

  readonly #shapeOutline = new ShapeOutlineController(this, {
    getTarget: () => this.#frame ?? null,
    getKind: () => (this.shape === 'circle' ? 'rounded' : this.shape),
    fallbackRadius: 8,
    strokeInset: 0.75,
  });

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLSpanElement;
    this.#frame = this.renderRoot.querySelector('.frame') as HTMLSpanElement;
    this.#img = this.renderRoot.querySelector('.image') as HTMLImageElement;
    this.#fallback = this.renderRoot.querySelector('.fallback') as HTMLSpanElement;
    this.#fallbackContent = this.renderRoot.querySelector('.fallback-content') as HTMLSpanElement;
    this.#statusEl = this.renderRoot.querySelector('.status') as HTMLSpanElement;
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;

    this.#img.addEventListener('error', () => {
      this.#imageFailed = true;
    });
    this.#img.addEventListener('load', () => {
      this.#imageFailed = false;
    });
    this.#slot.addEventListener('slotchange', () => {
      this.#hasSlottedFallback = this.#slot
        .assignedNodes({ flatten: true })
        .some((n) => n.nodeType === Node.ELEMENT_NODE || Boolean(n.textContent?.trim()));
    });
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('src')) {
      this.#imageFailed = false;
    }
  }

  protected override update(changed: PropertyValues): void {
    const showImage = Boolean(this.src.trim()) && !this.#imageFailed;

    if (showImage) {
      if (this.#img.getAttribute('src') !== this.src) {
        this.#img.src = this.src;
      }
      this.#img.alt = this.alt;
      this.#img.hidden = false;
      this.#fallback.hidden = true;
      this.#base.removeAttribute('role');
      this.#base.removeAttribute('aria-label');
    } else {
      this.#img.hidden = true;
      this.#img.removeAttribute('src');
      this.#fallback.hidden = false;

      if (this.alt) {
        this.#base.setAttribute('role', 'img');
        this.#base.setAttribute('aria-label', this.alt);
      } else {
        this.#base.removeAttribute('role');
        this.#base.removeAttribute('aria-label');
      }

      if (this.#hasSlottedFallback) {
        this.#fallbackContent.innerHTML = '';
        this.#fallbackContent.hidden = true;
      } else {
        this.#fallbackContent.hidden = false;
        const text = this.initials.trim() || deriveInitials(this.alt);
        if (text) {
          this.#fallbackContent.textContent = text;
        } else {
          this.#fallbackContent.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('user') ?? ''}</svg>`;
        }
      }
    }

    if (this.status) {
      this.#statusEl.hidden = false;
      this.#statusEl.setAttribute('aria-label', this.status);
    } else {
      this.#statusEl.hidden = true;
      this.#statusEl.removeAttribute('aria-label');
    }

    if (changed.has('shape') || changed.has('size')) {
      this.#shapeOutline.sync();
    }
  }
}

/**
 * Overlapping stack of `<k-avatar>` items with optional `+N` overflow counter.
 *
 * @tag k-avatar-group
 *
 * @slot - `<k-avatar>` elements.
 *
 * @csspart base - Flex stack wrapper.
 * @csspart overflow - `+N` overflow counter badge.
 */
export class KAvatarGroup extends KernoElement {
  static override styles = avatarGroupStyles;
  static override template = /* html */ `<div part="base" class="base" role="group"><slot></slot><span part="overflow" class="overflow" hidden></span></div>`;

  /** Maximum number of visible avatars before collapsing the remainder into `+N` (`0` = unlimited). */
  @prop({ type: Number, reflect: true }) accessor max = 0;
  /** Optional uniform size applied across the group and overflow chip. */
  @prop({ reflect: true }) accessor size: AvatarSize | '' = '';

  #slot!: HTMLSlotElement;
  #overflowEl!: HTMLSpanElement;

  protected override setup(): void {
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    this.#overflowEl = this.renderRoot.querySelector('.overflow') as HTMLSpanElement;
    this.#slot.addEventListener('slotchange', () => this.#syncOverflow());
  }

  protected override update(_changed: PropertyValues): void {
    this.#syncOverflow();
  }

  #syncOverflow(): void {
    const items = this.#slot
      .assignedElements({ flatten: true })
      .filter((el) => el.tagName.toLowerCase() === 'k-avatar');

    const limit = this.max > 0 ? Math.floor(this.max) : Infinity;
    let hiddenCount = 0;

    items.forEach((item, index) => {
      const overflowed = index >= limit;
      item.toggleAttribute('data-k-avatar-overflow', overflowed);
      if (overflowed) hiddenCount++;
    });

    if (hiddenCount > 0) {
      this.#overflowEl.hidden = false;
      this.#overflowEl.textContent = `+${hiddenCount}`;
      this.#overflowEl.setAttribute('aria-label', `${hiddenCount} more`);
    } else {
      this.#overflowEl.hidden = true;
      this.#overflowEl.textContent = '';
      this.#overflowEl.removeAttribute('aria-label');
    }
  }
}
