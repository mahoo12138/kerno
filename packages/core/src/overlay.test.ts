import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  autoPosition,
  computeFloatingPosition,
  enterTopLayer,
  exitTopLayer,
  overlayManager,
  supportsPopoverApi,
  uniqueId,
} from './index.js';

afterEach(() => {
  for (const entry of [...overlayManager.stack]) {
    overlayManager.remove(entry.id, false);
  }
  document.body.innerHTML = '';
});

describe('computeFloatingPosition', () => {
  it('places below anchor by default and flips to top when overflowing viewport bottom', () => {
    const normal = computeFloatingPosition(
      { x: 100, y: 50, width: 80, height: 30 },
      { width: 120, height: 60 },
      { width: 800, height: 600 },
      { placement: 'bottom', offset: 8 },
    );
    expect(normal).toEqual({ x: 80, y: 88, placement: 'bottom' });

    const flipped = computeFloatingPosition(
      { x: 100, y: 550, width: 80, height: 30 },
      { width: 120, height: 60 },
      { width: 800, height: 600 },
      { placement: 'bottom', offset: 8 },
    );
    expect(flipped).toEqual({ x: 80, y: 482, placement: 'top' });
  });

  it('clamps cross-axis coordinates inside viewport padding', () => {
    const shifted = computeFloatingPosition(
      { x: 4, y: 50, width: 20, height: 20 },
      { width: 200, height: 40 },
      { width: 500, height: 400 },
      { placement: 'bottom', padding: 10 },
    );
    expect(shifted.x).toBe(10);
  });
});

describe('overlayManager', () => {
  it('dismisses only the top-most overlay on Escape and restores focus on removal', async () => {
    document.body.innerHTML = `
      <button id="trigger">Open</button>
      <div id="overlay-1"><button id="b1">First</button></div>
      <div id="overlay-2"><button id="b2">Second</button></div>
    `;
    const trigger = document.getElementById('trigger') as HTMLButtonElement;
    const o1 = document.getElementById('overlay-1') as HTMLDivElement;
    const o2 = document.getElementById('overlay-2') as HTMLDivElement;

    trigger.focus();
    const close1 = vi.fn(() => overlayManager.remove('o1'));
    const close2 = vi.fn(() => overlayManager.remove('o2'));

    overlayManager.add({ id: 'o1', content: o1, lockScroll: true, onRequestClose: close1 });
    expect(document.body.style.overflow).toBe('hidden');

    overlayManager.add({ id: 'o2', content: o2, onRequestClose: close2 });

    await userEvent.keyboard('{Escape}');
    expect(close2).toHaveBeenCalledWith('escape');
    expect(close1).not.toHaveBeenCalled();

    await userEvent.keyboard('{Escape}');
    expect(close1).toHaveBeenCalledWith('escape');
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(trigger);
  });

  it('updates active overlay config in place and keeps focus on external target after outside-click', async () => {
    document.body.innerHTML = `
      <button id="trigger">Trigger</button>
      <button id="outside">Outside</button>
      <div id="popup"><button id="inside">Inside</button></div>
    `;
    const trigger = document.getElementById('trigger') as HTMLButtonElement;
    const outside = document.getElementById('outside') as HTMLButtonElement;
    const popup = document.getElementById('popup') as HTMLDivElement;

    trigger.focus();
    const onClose = vi.fn(() => overlayManager.remove('pop'));
    overlayManager.add({
      id: 'pop',
      content: popup,
      trigger,
      trapFocus: false,
      restoreFocus: true,
      onRequestClose: onClose,
    });

    // Updating options must not remove/re-add or lose stack entry
    overlayManager.update('pop', { closeOnEscape: false });
    expect(overlayManager.top?.closeOnEscape).toBe(false);

    // Clicking outside should dismiss WITHOUT pulling focus back to trigger
    outside.focus();
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(onClose).toHaveBeenCalledWith('outside-click');
    expect(document.activeElement).toBe(outside);
  });

  it('promotes and removes elements from browser Top Layer when Popover API is supported', () => {
    const el = document.createElement('div');
    document.body.append(el);
    if (supportsPopoverApi) {
      expect(enterTopLayer(el)).toBe(true);
      expect(el.matches(':popover-open')).toBe(true);
      exitTopLayer(el);
      expect(el.matches(':popover-open')).toBe(false);
    }
  });
});

describe('overlayManager hardening', () => {
  it('lets Escape through when the top overlay does not close on it', () => {
    document.body.innerHTML = '<div id="sticky"></div><div id="passive"></div>';
    const seen: boolean[] = [];
    const onKey = (event: KeyboardEvent): void => {
      seen.push(event.defaultPrevented);
    };
    document.addEventListener('keydown', onKey);
    const escape = (): void => {
      const init = { key: 'Escape', bubbles: true, cancelable: true };
      document.body.dispatchEvent(new KeyboardEvent('keydown', init));
    };

    const onSticky = vi.fn();
    const sticky = document.getElementById('sticky')!;
    overlayManager.add({
      id: 'sticky',
      content: sticky,
      closeOnEscape: false,
      onRequestClose: onSticky,
    });
    // No close handler at all: nothing to close, so Escape must not be swallowed.
    overlayManager.add({ id: 'passive', content: document.getElementById('passive')! });
    escape();
    overlayManager.remove('passive', false);
    escape();
    document.removeEventListener('keydown', onKey);

    expect(seen).toEqual([false, false]);
    expect(onSticky).not.toHaveBeenCalled();
  });

  it('compensates for the scrollbar it hides and restores inline styles', () => {
    document.body.innerHTML = '<div style="height: 3000px"></div><div id="panel"></div>';
    document.body.style.paddingRight = '3px';
    const root = document.documentElement;
    const gap = window.innerWidth - root.clientWidth;

    const panel = document.getElementById('panel')!;
    overlayManager.add({ id: 'lock', content: panel, lockScroll: true });
    expect(document.body.style.overflow).toBe('hidden');
    expect(root.style.getPropertyValue('--k-scrollbar-width')).toBe(`${gap}px`);
    if (gap > 0) expect(document.body.style.paddingRight).toBe(`${3 + gap}px`);

    overlayManager.remove('lock', false);
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.paddingRight).toBe('3px');
    expect(root.style.getPropertyValue('--k-scrollbar-width')).toBe('');
    document.body.style.paddingRight = '';
  });

  it('is shared through globalThis with other copies of @kerno/core', () => {
    expect(Reflect.get(globalThis, Symbol.for('kerno.overlay-manager.v1'))).toBe(overlayManager);
    const id = uniqueId('shared');
    expect(id).toMatch(/^shared-/);
    const counter = Reflect.get(globalThis, Symbol.for('kerno.unique-id.v1')) as
      { value: number } | undefined;
    expect(counter).toEqual({ value: expect.any(Number) });
    const before = counter!.value;
    uniqueId('shared');
    expect(counter!.value).toBe(before + 1);
  });
});

describe('autoPosition', () => {
  it('repositions after scrolling in the next animation frame', async () => {
    document.body.innerHTML = `
      <div id="scroller" style="height: 100px; overflow: auto">
        <div style="height: 1000px; padding-top: 50px"><button id="anchor">Anchor</button></div>
      </div>
      <div id="floating" style="width: 40px; height: 20px"></div>
    `;
    const scroller = document.getElementById('scroller')!;
    const anchor = document.getElementById('anchor')!;
    const floating = document.getElementById('floating')!;
    const options = { placement: 'bottom-start', offset: 0, flip: false, shift: false } as const;
    const stop = autoPosition(anchor, floating, options);
    const bottom = (): number => Math.round(anchor.getBoundingClientRect().bottom);
    expect(Number.parseFloat(floating.style.top)).toBe(bottom());

    const before = floating.style.top;
    scroller.scrollTop = 30;
    scroller.dispatchEvent(new Event('scroll'));
    expect(floating.style.top).toBe(before);

    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(Number.parseFloat(floating.style.top)).toBe(bottom());
    stop();
  });
});
