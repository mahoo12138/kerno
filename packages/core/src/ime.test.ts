import { afterEach, describe, expect, it, vi } from 'vitest';
import { isComposing, overlayManager } from './index.js';

const key = (init: KeyboardEventInit): KeyboardEvent =>
  new KeyboardEvent('keydown', { bubbles: true, composed: true, ...init });

afterEach(() => {
  for (const entry of [...overlayManager.stack]) {
    overlayManager.remove(entry.id, false);
  }
  document.body.innerHTML = '';
});

describe('isComposing', () => {
  it('detects IME composition via isComposing and the legacy 229 keyCode', () => {
    expect(isComposing(key({ key: 'Enter' }))).toBe(false);
    expect(isComposing(key({ key: 'Enter', isComposing: true }))).toBe(true);
    expect(isComposing(key({ key: 'Process', keyCode: 229 }))).toBe(true);
  });
});

describe('overlayManager during IME composition', () => {
  it('ignores the Escape that cancels an IME candidate', () => {
    document.body.innerHTML = '<div id="panel"><input /></div>';
    const onRequestClose = vi.fn();
    overlayManager.add({ id: 'ime', content: document.getElementById('panel')!, onRequestClose });

    document.dispatchEvent(key({ key: 'Escape', isComposing: true }));
    expect(onRequestClose).not.toHaveBeenCalled();

    document.dispatchEvent(key({ key: 'Escape' }));
    expect(onRequestClose).toHaveBeenCalledWith('escape');
  });
});
