import { afterEach, describe, expect, it } from 'vitest';
import './define.js';
import { KIcon, hasIcon, listIcons, registerIcon } from './index.js';

const mount = async (html: string): Promise<KIcon> => {
  document.body.innerHTML = html;
  const el = document.querySelector('k-icon') as KIcon;
  await el.updateComplete;
  return el;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-icon>', () => {
  it('renders built-in icons as decorative by default and exposes role="img" when label is provided', async () => {
    expect(hasIcon('check')).toBe(true);
    expect(listIcons()).toContain('search');

    const el = await mount('<k-icon name="check"></k-icon>');
    expect(el).toBeInstanceOf(KIcon);
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.shadowRoot!.querySelector('[part="svg"]')).not.toBeNull();

    el.label = 'Completed';
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Completed');
    expect(el.hasAttribute('aria-hidden')).toBe(false);
  });

  it('supports custom registered icons and late registration updates', async () => {
    const el = await mount('<k-icon name="custom-bolt" size="24px"></k-icon>');
    expect(el.shadowRoot!.querySelector('[part="svg"]')).toBeNull();

    registerIcon('custom-bolt', '<path d="M9 2L3 9h5l-1 5 6-7H8l1-5z"/>');
    expect(el.shadowRoot!.querySelector('[part="svg"] path')).not.toBeNull();
    expect(getComputedStyle(el).width).toBe('24px');
  });

  it('prefers custom slotted SVG over named icon', async () => {
    const el = await mount(
      '<k-icon name="check"><svg id="custom-svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4"/></svg></k-icon>',
    );
    const glyph = el.shadowRoot!.querySelector<HTMLElement>('.glyph')!;
    expect(glyph.hidden).toBe(true);
  });
});
