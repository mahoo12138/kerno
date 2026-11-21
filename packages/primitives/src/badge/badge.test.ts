import { afterEach, describe, expect, it } from 'vitest';
import './define.js';
import type { KBadge } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-badge>', () => {
  it('renders slotted text and reflects variant and pill attributes', async () => {
    document.body.innerHTML = `<k-badge variant="success" pill>Online</k-badge>`;
    const badge = document.querySelector('k-badge') as KBadge;
    await badge.updateComplete;

    expect(badge.variant).toBe('success');
    expect(badge.pill).toBe(true);
    expect(badge.getAttribute('variant')).toBe('success');
    expect(badge.hasAttribute('pill')).toBe(true);
    expect(badge.textContent).toBe('Online');

    badge.variant = 'danger';
    badge.pill = false;
    await badge.updateComplete;
    expect(badge.getAttribute('variant')).toBe('danger');
    expect(badge.hasAttribute('pill')).toBe(false);
  });

  it('defaults to neutral non-pill badge and respects hidden', async () => {
    document.body.innerHTML = `<k-badge>Beta</k-badge>`;
    const badge = document.querySelector('k-badge') as KBadge;
    await badge.updateComplete;

    expect(badge.variant).toBe('neutral');
    expect(badge.pill).toBe(false);
    expect(badge.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();

    badge.hidden = true;
    expect(getComputedStyle(badge).display).toBe('none');
  });
});
