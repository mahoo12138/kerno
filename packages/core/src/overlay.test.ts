import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeFloatingPosition, overlayManager } from './index.js';

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
});
