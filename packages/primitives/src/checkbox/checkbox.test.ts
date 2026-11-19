import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import type { KCheckbox } from './index.js';

const mount = async <T extends HTMLElement = KCheckbox>(html: string): Promise<T> => {
  document.body.innerHTML = html;
  const boxes = [...document.querySelectorAll('k-checkbox')];
  await Promise.all(boxes.map((b) => b.updateComplete));
  return document.body.firstElementChild as T;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-checkbox>', () => {
  it('toggles via click and Space key, clearing indeterminate state', async () => {
    const el = await mount('<k-checkbox indeterminate>Accept terms</k-checkbox>');
    const control = el.shadowRoot!.querySelector('[part="control"]')!;
    expect(control.getAttribute('aria-checked')).toBe('mixed');

    const onChange = vi.fn();
    el.addEventListener('change', onChange);

    el.click();
    await el.updateComplete;
    expect(el.indeterminate).toBe(false);
    expect(el.checked).toBe(true);
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(onChange).toHaveBeenCalledOnce();

    el.focus();
    await userEvent.keyboard(' ');
    await el.updateComplete;
    expect(el.checked).toBe(false);
    expect(control.getAttribute('aria-checked')).toBe('false');
  });

  it('submits value only when checked, validates required and resets cleanly', async () => {
    const form = await mount<HTMLFormElement>(`
      <form>
        <k-checkbox name="terms" value="agreed" required></k-checkbox>
      </form>
    `);
    const cb = form.querySelector('k-checkbox')!;
    expect(cb.checkValidity()).toBe(false);
    expect(new FormData(form).get('terms')).toBeNull();

    cb.click();
    await cb.updateComplete;
    expect(cb.checkValidity()).toBe(true);
    expect(new FormData(form).get('terms')).toBe('agreed');

    form.reset();
    await cb.updateComplete;
    expect(cb.checked).toBe(false);
    expect(new FormData(form).get('terms')).toBeNull();
  });

  it('ignores activation while disabled', async () => {
    const el = await mount('<k-checkbox disabled>Disabled</k-checkbox>');
    const onChange = vi.fn();
    el.addEventListener('change', onChange);
    el.click();
    await el.updateComplete;
    expect(el.checked).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps checked hover fill and border inside the accent chromatic ramp', async () => {
    document.head.insertAdjacentHTML(
      'beforeend',
      '<style id="cb-accent">:root { --k-color-accent-default: rgb(13, 148, 136); --k-color-accent-hover: rgb(20, 184, 166); --k-color-accent-border-hover: rgb(94, 234, 212); }</style>',
    );
    const el = await mount('<k-checkbox checked>Checked</k-checkbox>');
    const control = el.shadowRoot!.querySelector<HTMLElement>('.control')!;
    expect(getComputedStyle(control).backgroundColor).toBe('rgb(13, 148, 136)');
    expect(getComputedStyle(control).borderTopColor).toBe('rgba(0, 0, 0, 0)');

    await userEvent.hover(control);
    expect(getComputedStyle(control).backgroundColor).toBe('rgb(20, 184, 166)');
    expect(getComputedStyle(control).borderTopColor).toBe('rgb(94, 234, 212)');

    await userEvent.unhover(control);
    document.getElementById('cb-accent')!.remove();
  });
});
