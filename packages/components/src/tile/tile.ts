import { css, prop, type PropertyValues } from '@kerno/core';
import { KSurface, surfaceStyles } from '@kerno/effects';
import { token } from '@kerno/tokens';
import { inNestedTile, installGate, isDisabled, markKeyboardPress } from './gate.js';
import { isLaunching, replay, startLaunch } from './launch.js';
import { TILE_BRAND } from './shared.js';

interface PressableSurface extends Element {
  press(at?: { x: number; y: number } | 'center'): void;
  release(): void;
}

export const tileStyles = css`
  ${surfaceStyles}

  :host {
    --k-surface-border-width: 2px;
    --k-surface-radius: 0px;
    --k-surface-padding: 0px;
    --k-tilt-mode: absolute;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
  }

  .content {
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  ::slotted([slot='action']) {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    box-sizing: border-box;
    margin: 0;
    padding: 0 10px 8px;
    border: 0;
    border-radius: 0;
    background: none;
    font: inherit;
    font-size: ${token('font.size.xs')};
    font-weight: ${token('font.weight.medium')};
    color: inherit;
    text-decoration: none;
    text-align: start;
    cursor: pointer;
  }

  :host([label='hidden']) ::slotted([slot='action']) {
    font-size: 0 !important;
    line-height: 0 !important;
  }

  :host(:not([focus-ring='native'])) ::slotted([slot='action']) {
    outline: none !important;
  }

  :host(:not([focus-ring='native']):focus-within) {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: -2px;
    box-shadow: inset 0 0 0 3px ${token('color.stroke.focusInner')};
  }
`;

/**
 * Windows Start Screen / Axiom Design System live tile (`<k-tile>`).
 *
 * Built on `<k-surface>`, with a single full-bleed action (`slot="action"`),
 * delayed activation that lets the physical 3D tilt and Reveal press wave
 * complete before firing the action, inner surface press forwarding, and
 * optional Windows 8.1 3D flip + splash screen app launch (`--k-tile-launch: flip`
 * or `tile.launch(ready?)`).
 *
 * @tag k-tile
 *
 * @slot - Tile body content (icons, live metrics, background artwork).
 * @slot action - Single `<a slot="action">` or `<button slot="action">` covering the tile.
 * @slot splash - Optional `<template slot="splash">` rendered on the full-screen launch splash.
 */
export class KTile extends KSurface {
  static override styles = tileStyles;
  static override template = /* html */ `<canvas part="shadow" class="shadow-canvas" aria-hidden="true" hidden></canvas><div part="backdrop" class="backdrop" aria-hidden="true"></div><canvas part="canvas" class="canvas" aria-hidden="true"></canvas><div part="clip" class="clip"><div part="content" class="content"><slot></slot><slot name="action"></slot></div></div>`;

  /** Grid column span when placed inside `<k-tile-group>` (defaults to `2`). */
  @prop({ type: Number, reflect: true }) accessor columns = 2;

  /** Grid row span when placed inside `<k-tile-group>` (defaults to `2`). */
  @prop({ type: Number, reflect: true }) accessor rows = 2;

  /** Set to `'hidden'` to hide the action label visually while preserving its accessible name. */
  @prop({ reflect: true }) accessor label: '' | 'hidden' = '';

  /** Set to `'native'` to use the browser's focus ring instead of the tile's focus frame. */
  @prop({ attribute: 'focus-ring', reflect: true }) accessor focusRing: '' | 'native' = '';

  /** Set to `'immediate'` to run the action immediately on click without waiting for press feedback. */
  @prop({ reflect: true }) accessor activation: '' | 'immediate' = '';

  #keyHeld = '';
  #pressedInner: PressableSurface[] = [];

  constructor() {
    super();
    this.reveal = true;
    this.pressure = true;
    this.addEventListener('pointerdown', this.#onTilePointerDown);
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('keyup', this.#onKeyUp);
    this.addEventListener('focusout', this.#onFocusOut);
  }

  get [TILE_BRAND as unknown as string](): boolean {
    return true;
  }

  override connectedCallback(): void {
    installGate();
    super.connectedCallback();
  }

  protected override setup(): void {
    super.setup();
    const actionSlot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="action"]');
    actionSlot?.addEventListener('slotchange', () => this.#syncActionInteractivity());
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    this.#syncActionInteractivity();
  }

  /**
   * Programmatically runs the Windows 8.1 3D flip + full-screen splash launch
   * for this tile's action, holding the splash until `ready` settles.
   */
  launch(ready?: Promise<unknown>): Promise<void> {
    const action = this.actionElement();
    if (!action || isDisabled(action)) {
      return Promise.reject(new Error('<k-tile>.launch(): the tile has no enabled action'));
    }
    if (isLaunching(this)) {
      return Promise.reject(new Error('<k-tile>.launch(): a launch of this tile is running'));
    }
    const run = startLaunch(this, action, () => replay(null, action, this), ready ?? null);
    if (run) return run;
    replay(null, action, this);
    return Promise.resolve();
  }

  /** Returns the first direct child with `slot="action"`, or `null` for a static tile. */
  actionElement(): Element | null {
    for (let child = this.firstElementChild; child; child = child.nextElementSibling) {
      if (child.getAttribute('slot') === 'action') return child;
    }
    return null;
  }

  override release(takenOver = true): void {
    super.release(takenOver);
    this.#releaseInner();
  }

  #syncActionInteractivity(): void {
    const action = this.actionElement();
    const active = Boolean(action && !isDisabled(action));
    this.revealController.enabled = this.reveal && active;
    this.pressureController.enabled = this.pressure && active;
  }

  #pressInner(clientX: number | null, clientY: number | null): void {
    this.#releaseInner();
    const all = this.querySelectorAll('*');
    for (let i = 0; i < all.length; i++) {
      const surface = all[i] as PressableSurface;
      if (
        typeof surface.press !== 'function' ||
        typeof surface.release !== 'function' ||
        inNestedTile(surface, this)
      ) {
        continue;
      }
      if (clientX === null || clientY === null) {
        surface.press('center');
      } else {
        const r = surface.getBoundingClientRect();
        surface.press({ x: clientX - r.left, y: clientY - r.top });
      }
      this.#pressedInner.push(surface);
    }
  }

  #releaseInner(): void {
    const pressed = this.#pressedInner;
    this.#pressedInner = [];
    for (const surface of pressed) surface.release();
  }

  #onTilePointerDown = (event: PointerEvent): void => {
    this.pressTakenOver = false;
    const action = this.actionElement();
    if (
      !action ||
      event.button !== 0 ||
      isDisabled(action) ||
      !event.composedPath().includes(action)
    ) {
      return;
    }
    this.#pressInner(event.clientX, event.clientY);
    if (!this.#pressedInner.length) return;
    const end = (): void => {
      window.removeEventListener('pointerup', end, true);
      window.removeEventListener('pointercancel', end, true);
      this.#releaseInner();
    };
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const action = this.actionElement();
    if (!action || !event.composedPath().includes(action)) return;
    if (
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      isDisabled(action)
    ) {
      return;
    }
    const space = event.key === ' ' || event.key === 'Spacebar';
    if (event.key !== 'Enter' && !(space && action.localName === 'button')) return;
    this.#keyHeld = event.key;
    markKeyboardPress(this);
    this.press('center');
    this.#pressInner(null, null);
  };

  #onKeyUp = (event: KeyboardEvent): void => {
    if (this.#keyHeld && event.key === this.#keyHeld) {
      this.#keyHeld = '';
      this.release(false);
    }
  };

  #onFocusOut = (event: FocusEvent): void => {
    const action = this.actionElement();
    if (this.#keyHeld && action && event.composedPath().includes(action)) {
      this.#keyHeld = '';
      this.release(false);
    }
  };
}
