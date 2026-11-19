import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import type { KSwitch } from './index.js';

const mount = async <T extends HTMLElement = KSwitch>(html: string): Promise<T> => {
  document.body.innerHTML = html;
  const switches = [...document.querySelectorAll('k-switch')];
  await Promise.all(switches.map((s) => s.updateComplete));
  return document.body.firstElementChild as T;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-switch>', () => {
  it('exposes role="switch", toggles on click/Space and participates in forms', async () => {
    const form = await mount<HTMLFormElement>(`
      <form>
        <k-switch name="notifications" value="enabled" required>Notifications</k-switch>
      </form>
    `);
    const sw = form.querySelector('k-switch')!;
    const track = sw.shadowRoot!.querySelector('[part="track"]')!;
    expect(track.getAttribute('role')).toBe('switch');
    expect(track.getAttribute('aria-checked')).toBe('false');
    expect(sw.checkValidity()).toBe(false);

    const onChange = vi.fn();
    sw.addEventListener('change', onChange);

    sw.click();
    await sw.updateComplete;
    expect(sw.checked).toBe(true);
    expect(track.getAttribute('aria-checked')).toBe('true');
    expect(sw.checkValidity()).toBe(true);
    expect(new FormData(form).get('notifications')).toBe('enabled');
    expect(onChange).toHaveBeenCalledOnce();

    sw.focus();
    await userEvent.keyboard(' ');
    await sw.updateComplete;
    expect(sw.checked).toBe(false);

    sw.checked = true;
    await sw.updateComplete;
    form.reset();
    await sw.updateComplete;
    expect(sw.checked).toBe(false);
  });

  it('reveals chromatic accent hover border on checked switch without gray fallback', async () => {
    document.head.insertAdjacentHTML(
      'beforeend',
      '<style id="sw-accent">:root { --k-color-accent-default: rgb(13, 148, 136); --k-color-accent-hover: rgb(20, 184, 166); --k-color-accent-border-hover: rgb(94, 234, 212); }</style>',
    );
    const el = await mount('<k-switch checked>Telemetry</k-switch>');
    const track = el.shadowRoot!.querySelector<HTMLElement>('.track')!;
    expect(getComputedStyle(track).backgroundColor).toBe('rgb(13, 148, 136)');
    expect(getComputedStyle(track).borderTopColor).toBe('rgba(0, 0, 0, 0)');

    await userEvent.hover(track);
    expect(getComputedStyle(track).backgroundColor).toBe('rgb(20, 184, 166)');
    expect(getComputedStyle(track).borderTopColor).toBe('rgb(94, 234, 212)');

    await userEvent.unhover(track);
    document.getElementById('sw-accent')!.remove();
  });
});
