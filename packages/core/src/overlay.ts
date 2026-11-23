import { isServer } from './env.js';
import { isComposing } from './events.js';
import { getActiveElement, getTabbableElements } from './focus.js';

export type Placement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

export interface FloatingOptions {
  placement?: Placement;
  offset?: number;
  padding?: number;
  flip?: boolean;
  shift?: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingCoords {
  x: number;
  y: number;
  placement: Placement;
}

/**
 * Pure geometry solver for anchored floating overlays (Popover, Tooltip, Dropdown).
 * Supports 12 placements, main-axis viewport flipping and cross-axis clamping.
 */
export function computeFloatingPosition(
  anchor: Rect,
  floating: { width: number; height: number },
  viewport: { width: number; height: number },
  options: FloatingOptions = {},
): FloatingCoords {
  const requested = options.placement ?? 'bottom';
  const offset = options.offset ?? 8;
  const padding = options.padding ?? 8;
  const flip = options.flip ?? true;
  const shift = options.shift ?? true;

  const [baseSide, align] = requested.split('-') as [
    'top' | 'bottom' | 'left' | 'right',
    'start' | 'end' | undefined,
  ];

  let side = baseSide;

  if (flip) {
    const spaceTop = anchor.y - offset - padding;
    const spaceBottom = viewport.height - (anchor.y + anchor.height) - offset - padding;
    const spaceLeft = anchor.x - offset - padding;
    const spaceRight = viewport.width - (anchor.x + anchor.width) - offset - padding;

    if (side === 'bottom' && floating.height > spaceBottom && spaceTop > spaceBottom) {
      side = 'top';
    } else if (side === 'top' && floating.height > spaceTop && spaceBottom > spaceTop) {
      side = 'bottom';
    } else if (side === 'right' && floating.width > spaceRight && spaceLeft > spaceRight) {
      side = 'left';
    } else if (side === 'left' && floating.width > spaceLeft && spaceRight > spaceLeft) {
      side = 'right';
    }
  }

  let x: number;
  let y: number;

  if (side === 'top' || side === 'bottom') {
    y = side === 'top' ? anchor.y - floating.height - offset : anchor.y + anchor.height + offset;
    if (align === 'start') {
      x = anchor.x;
    } else if (align === 'end') {
      x = anchor.x + anchor.width - floating.width;
    } else {
      x = anchor.x + (anchor.width - floating.width) / 2;
    }

    if (shift) {
      const minX = padding;
      const maxX = Math.max(padding, viewport.width - floating.width - padding);
      x = Math.min(maxX, Math.max(minX, x));
    }
  } else {
    x = side === 'left' ? anchor.x - floating.width - offset : anchor.x + anchor.width + offset;
    if (align === 'start') {
      y = anchor.y;
    } else if (align === 'end') {
      y = anchor.y + anchor.height - floating.height;
    } else {
      y = anchor.y + (anchor.height - floating.height) / 2;
    }

    if (shift) {
      const minY = padding;
      const maxY = Math.max(padding, viewport.height - floating.height - padding);
      y = Math.min(maxY, Math.max(minY, y));
    }
  }

  const finalPlacement = (align ? `${side}-${align}` : side) as Placement;
  return {
    x: Math.round(x),
    y: Math.round(y),
    placement: finalPlacement,
  };
}

interface Positioner {
  measure(): FloatingCoords;
  apply(coords: FloatingCoords): void;
}

const pendingPositioners = new Set<Positioner>();
let positionFrame: number | null = null;

/** Repositions every scheduled overlay: all reads first, then all writes (one layout pass). */
function flushPositions(): void {
  positionFrame = null;
  const batch = [...pendingPositioners];
  pendingPositioners.clear();
  const coords = batch.map((p) => p.measure());
  batch.forEach((p, i) => p.apply(coords[i]!));
}

function schedulePosition(positioner: Positioner): void {
  pendingPositioners.add(positioner);
  positionFrame ??= requestAnimationFrame(flushPositions);
}

/**
 * Positions `floating` (`position: fixed`) relative to `anchor` and keeps it
 * synchronized until the returned cleanup function is called.
 *
 * Scroll and resize updates are coalesced into one animation frame shared by
 * every open overlay, so several overlays or nested scrollers never force a
 * layout per event. Size changes (ResizeObserver) apply immediately.
 */
export function autoPosition(
  anchor: Element,
  floating: HTMLElement,
  options: FloatingOptions = {},
  onUpdate?: (coords: FloatingCoords) => void,
): () => void {
  if (isServer) return () => {};

  const positioner: Positioner = {
    measure() {
      const a = anchor.getBoundingClientRect();
      const f = floating.getBoundingClientRect();
      return computeFloatingPosition(
        { x: a.left, y: a.top, width: a.width, height: a.height },
        { width: f.width || floating.offsetWidth, height: f.height || floating.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
        options,
      );
    },
    apply(coords) {
      floating.style.position = 'fixed';
      floating.style.left = `${coords.x}px`;
      floating.style.top = `${coords.y}px`;
      floating.dataset.placement = coords.placement;
      onUpdate?.(coords);
    },
  };
  const update = (): void => positioner.apply(positioner.measure());
  const schedule = (): void => schedulePosition(positioner);

  update();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('scroll', schedule, { capture: true, passive: true });

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver === 'function') {
    // Observations arrive once per frame, after layout: apply them right away.
    ro = new ResizeObserver(update);
    ro.observe(anchor);
    ro.observe(floating);
  }

  return () => {
    window.removeEventListener('resize', schedule);
    window.removeEventListener('scroll', schedule, { capture: true });
    ro?.disconnect();
    pendingPositioners.delete(positioner);
    if (pendingPositioners.size === 0 && positionFrame !== null) {
      cancelAnimationFrame(positionFrame);
      positionFrame = null;
    }
  };
}

export const supportsPopoverApi: boolean =
  !isServer &&
  typeof HTMLElement !== 'undefined' &&
  typeof HTMLElement.prototype.showPopover === 'function';

/**
 * Promotes `el` into the browser Top Layer via `popover="manual"` so floating
 * overlays escape ancestor `transform`, `filter`, `overflow` and `z-index`
 * stacking contexts. Falls back gracefully where Popover API is unavailable.
 */
export function enterTopLayer(el: HTMLElement): boolean {
  if (!supportsPopoverApi || !el.isConnected) return false;
  if (el.getAttribute('popover') !== 'manual') {
    el.setAttribute('popover', 'manual');
  }
  try {
    if (!el.matches(':popover-open')) {
      el.showPopover();
    }
    return true;
  } catch {
    return false;
  }
}

/** Removes `el` from the browser Top Layer. */
export function exitTopLayer(el: HTMLElement): void {
  if (!supportsPopoverApi) return;
  try {
    if (el.matches(':popover-open')) {
      el.hidePopover();
    }
  } catch {
    // Element may already be disconnected or closed.
  }
}

export type OverlayCloseReason = 'escape' | 'outside-click' | 'programmatic';

export interface OverlayConfig {
  readonly id: string;
  /** The overlay surface/panel element. */
  readonly content: HTMLElement;
  /** Optional trigger element that should not count as an outside click. */
  readonly trigger?: Element | null;
  /** Traps Tab focus within `content`. */
  readonly trapFocus?: boolean;
  /** Locks document scrolling while open. */
  readonly lockScroll?: boolean;
  /** Restores focus to the previously active element when closed. */
  readonly restoreFocus?: boolean;
  /** Dismisses when `Escape` is pressed while this overlay is on top. Defaults to `true`. */
  readonly closeOnEscape?: boolean;
  /** Dismisses on pointerdown outside `content` and `trigger`. Defaults to `true`. */
  readonly closeOnOutsideClick?: boolean;
  readonly onRequestClose?: (reason: OverlayCloseReason) => void;
}

interface ActiveOverlay extends OverlayConfig {
  readonly previouslyFocused: HTMLElement | null;
  suppressFocusRestore: boolean;
}

/**
 * Document-wide LIFO overlay stack managing `Escape` dismissal, outside-click
 * detection across Shadow DOM, focus trapping, focus restoration, and scroll lock.
 */
class OverlayManager {
  #stack: ActiveOverlay[] = [];
  #listening = false;
  /** Inline styles replaced while page scrolling is locked; `null` when unlocked. */
  #scrollLock: { overflow: string; paddingRight: string } | null = null;

  get stack(): readonly OverlayConfig[] {
    return this.#stack;
  }

  get top(): OverlayConfig | undefined {
    return this.#stack[this.#stack.length - 1];
  }

  /** Pushes an overlay onto the top of the stack. */
  add(config: OverlayConfig): () => void {
    this.remove(config.id, false);
    const active = isServer ? null : getActiveElement();
    const entry: ActiveOverlay = {
      closeOnEscape: true,
      closeOnOutsideClick: true,
      restoreFocus: true,
      ...config,
      previouslyFocused: active instanceof HTMLElement ? active : null,
      suppressFocusRestore: false,
    };
    this.#stack.push(entry);
    this.#syncListeners();
    this.#syncScrollLock();

    if (!isServer && entry.trapFocus) {
      queueMicrotask(() => {
        if (!this.#stack.includes(entry)) return;
        const tabbables = getTabbableElements(entry.content);
        if (tabbables[0]) {
          tabbables[0].focus();
        } else {
          entry.content.focus();
        }
      });
    }

    return () => this.remove(config.id);
  }

  /**
   * Updates an active overlay's options in place without altering stack order,
   * overwriting `previouslyFocused`, or re-stealing focus.
   */
  update(id: string, patch: Partial<Omit<OverlayConfig, 'id'>>): void {
    const idx = this.#stack.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const current = this.#stack[idx]!;
    this.#stack[idx] = { ...current, ...patch };
    this.#syncScrollLock();
  }

  /** Removes an overlay from the stack and optionally restores focus. */
  remove(id: string, restoreFocus = true): void {
    const idx = this.#stack.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const [removed] = this.#stack.splice(idx, 1);
    this.#syncListeners();
    this.#syncScrollLock();

    if (
      restoreFocus &&
      removed &&
      !removed.suppressFocusRestore &&
      removed.restoreFocus &&
      removed.previouslyFocused &&
      removed.previouslyFocused.isConnected
    ) {
      removed.previouslyFocused.focus();
    }
  }

  has(id: string): boolean {
    return this.#stack.some((e) => e.id === id);
  }

  #syncListeners(): void {
    if (isServer) return;
    if (this.#stack.length > 0 && !this.#listening) {
      this.#listening = true;
      document.addEventListener('keydown', this.#onKeyDown, true);
      document.addEventListener('pointerdown', this.#onPointerDown, true);
    } else if (this.#stack.length === 0 && this.#listening) {
      this.#listening = false;
      document.removeEventListener('keydown', this.#onKeyDown, true);
      document.removeEventListener('pointerdown', this.#onPointerDown, true);
    }
  }

  #syncScrollLock(): void {
    if (isServer) return;
    const shouldLock = this.#stack.some((e) => e.lockScroll);
    if (shouldLock && !this.#scrollLock) this.#lockScroll();
    else if (!shouldLock && this.#scrollLock) this.#unlockScroll();
  }

  #lockScroll(): void {
    const { body, documentElement: root } = document;
    if (!body) return;
    // Hiding the page scrollbar widens the viewport; pad the body so content doesn't shift.
    // With `scrollbar-gutter: stable` the gutter stays reserved and nothing shifts.
    const gutter = getComputedStyle(root).getPropertyValue('scrollbar-gutter');
    const gap = gutter.includes('stable') ? 0 : Math.max(0, window.innerWidth - root.clientWidth);
    this.#scrollLock = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    if (gap > 0) {
      const padding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${padding + gap}px`;
    }
    // Lets fixed-position UI compensate too, e.g. `right: var(--k-scrollbar-width, 0px)`.
    root.style.setProperty('--k-scrollbar-width', `${gap}px`);
    body.style.overflow = 'hidden';
  }

  #unlockScroll(): void {
    const saved = this.#scrollLock;
    this.#scrollLock = null;
    if (!saved) return;
    document.body.style.overflow = saved.overflow;
    document.body.style.paddingRight = saved.paddingRight;
    document.documentElement.style.removeProperty('--k-scrollbar-width');
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    const top = this.#stack[this.#stack.length - 1];
    // Escape/Tab during IME composition belong to the input method, not the overlay.
    if (!top || isComposing(event)) return;

    if (event.key === 'Escape') {
      // Only claim Escape when it closes something; otherwise the page should still see it.
      if (top.closeOnEscape === false || !top.onRequestClose) return;
      event.preventDefault();
      event.stopPropagation();
      top.onRequestClose('escape');
      return;
    }

    if (event.key === 'Tab' && top.trapFocus) {
      const tabbables = getTabbableElements(top.content);
      if (tabbables.length === 0) {
        event.preventDefault();
        top.content.focus();
        return;
      }
      const first = tabbables[0]!;
      const last = tabbables[tabbables.length - 1]!;
      const active = getActiveElement();

      if (event.shiftKey) {
        if (active === first || !tabbables.includes(active as HTMLElement)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !tabbables.includes(active as HTMLElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  };

  #onPointerDown = (event: PointerEvent): void => {
    const top = this.#stack[this.#stack.length - 1];
    if (!top || top.closeOnOutsideClick === false) return;

    const path = event.composedPath();
    if (path.includes(top.content)) return;
    if (top.trigger && path.includes(top.trigger)) return;

    // Outside click: let focus land on the user's clicked target instead of pulling it back.
    top.suppressFocusRestore = !top.trapFocus;
    top.onRequestClose?.('outside-click');
  };
}

/**
 * Versioned by the manager's protocol, not the package version: every copy of
 * `@kerno/core` on a page (e.g. two Kerno versions in different bundles) shares
 * one stack, so Escape closes one layer at a time and only one set of document
 * listeners exists.
 */
const OVERLAY_MANAGER_KEY = Symbol.for('kerno.overlay-manager.v1');

function sharedOverlayManager(): OverlayManager {
  const registry = globalThis as unknown as Record<symbol, OverlayManager | undefined>;
  return (registry[OVERLAY_MANAGER_KEY] ??= new OverlayManager());
}

export const overlayManager: OverlayManager = sharedOverlayManager();
