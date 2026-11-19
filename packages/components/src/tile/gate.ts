import { parseActivationDelayMax } from './delay.js';
import { flips, isLaunching, replay, startLaunch } from './launch.js';
import { shared, TILE_BRAND } from './shared.js';

interface TileLike extends Element {
  pressTakenOver: boolean;
  pressRemaining(): number;
}

export function installGate(): void {
  if (typeof window === 'undefined') return;
  const gate = shared();
  if (gate.installed) return;
  gate.installed = true;
  window.addEventListener('click', onClick, true);
}

export function markKeyboardPress(tile: Element): void {
  const gate = shared();
  gate.keyboard.add(tile);
  requestAnimationFrame(() => gate.keyboard.delete(tile));
}

export function isDisabled(action: Element): boolean {
  return (
    (action as HTMLButtonElement).disabled === true ||
    action.getAttribute('aria-disabled') === 'true'
  );
}

function swallow(event: Event): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function isTileBrand(el: Element): boolean {
  return (el as unknown as Record<string | symbol, unknown>)[TILE_BRAND] === true;
}

function actionOf(event: Event): { action: Element; tile: Element } | null {
  for (const node of event.composedPath()) {
    if ((node as Node).nodeType !== 1) continue;
    const element = node as Element;
    const parent = element.parentElement;
    if (element.getAttribute('slot') === 'action' && parent && isTileBrand(parent)) {
      return { action: element, tile: parent };
    }
  }
  return null;
}

export function inNestedTile(element: Element, tile: Element): boolean {
  for (let n = element.parentElement; n && n !== tile; n = n.parentElement) {
    if (isTileBrand(n)) return true;
  }
  return false;
}

function remainingOf(tile: Element): number {
  let ms = (tile as TileLike).pressRemaining();
  const all = tile.querySelectorAll('*');
  for (let i = 0; i < all.length; i++) {
    const element = all[i] as Element & { pressRemaining?: () => number };
    if (typeof element.pressRemaining === 'function' && !inNestedTile(element, tile)) {
      ms = Math.max(ms, element.pressRemaining());
    }
  }
  return ms;
}

function activationDelayMax(tile: Element): number | null {
  const style = getComputedStyle(tile);
  const raw =
    style.getPropertyValue('--k-tile-activation-delay-max').trim() ||
    style.getPropertyValue('--ax-tile-activation-delay-max').trim();
  return parseActivationDelayMax(raw);
}

function activateAfterFeedback(
  event: MouseEvent,
  target: EventTarget,
  tile: Element,
  keyboard: boolean,
): void {
  const wait = (ms: number): void => {
    const cap = activationDelayMax(tile);
    window.setTimeout(
      () => replay(event, target, tile),
      Math.max(0, cap === null ? ms : Math.min(ms, cap)),
    );
  };
  if (keyboard) requestAnimationFrame(() => wait(remainingOf(tile)));
  else wait(remainingOf(tile));
}

function onClick(event: MouseEvent): void {
  const gate = shared();
  if (gate.replays.has(event)) return;
  const found = actionOf(event);
  if (!found) return;
  const { action, tile } = found;
  if (
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    event.defaultPrevented
  ) {
    return;
  }
  if (isDisabled(action) || tile.getAttribute('activation') === 'immediate') return;
  if ((tile as TileLike).pressTakenOver) {
    (tile as TileLike).pressTakenOver = false;
    swallow(event);
    return;
  }
  if (gate.pending.has(tile) || isLaunching(tile)) {
    swallow(event);
    return;
  }

  const target = event.composedPath()[0] || event.target!;
  const keyboard = gate.keyboard.has(tile);
  if (flips(tile)) {
    swallow(event);
    gate.pending.add(tile);
    if (startLaunch(tile, action, () => replay(event, target, tile), null)) return;
    activateAfterFeedback(event, target, tile, keyboard);
    return;
  }

  const remaining = keyboard ? 0 : remainingOf(tile);
  if (!keyboard && remaining <= 0) return;

  swallow(event);
  gate.pending.add(tile);
  activateAfterFeedback(event, target, tile, keyboard);
}
