import { afterEach, describe, expect, it } from 'vitest';
import './define.js';
import type { KSeparator } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-separator>', () => {
  it('exposes role="separator" and updates aria-orientation for horizontal and vertical modes', async () => {
    document.body.innerHTML = `<k-separator></k-separator>`;
    const sep = document.querySelector('k-separator') as KSeparator;
    await sep.updateComplete;

    expect(sep.orientation).toBe('horizontal');
    expect(sep.getAttribute('role')).toBe('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('horizontal');

    sep.orientation = 'vertical';
    await sep.updateComplete;
    expect(sep.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('switches to role="none" and drops aria-orientation when decorative is enabled', async () => {
    document.body.innerHTML = `<k-separator decorative></k-separator>`;
    const sep = document.querySelector('k-separator') as KSeparator;
    await sep.updateComplete;

    expect(sep.getAttribute('role')).toBe('none');
    expect(sep.hasAttribute('aria-orientation')).toBe(false);

    sep.decorative = false;
    await sep.updateComplete;
    expect(sep.getAttribute('role')).toBe('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('horizontal');
  });
});
