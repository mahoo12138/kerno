import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import type { KRadio, KRadioGroup } from './index.js';

const mount = async <T extends HTMLElement>(html: string): Promise<T> => {
  document.body.innerHTML = html;
  const groups = [...document.querySelectorAll('k-radio-group')];
  const radios = [...document.querySelectorAll('k-radio')];
  await Promise.all([...groups, ...radios].map((el) => el.updateComplete));
  return document.body.firstElementChild as T;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-radio-group> & <k-radio>', () => {
  it('coordinates selection, roving tabindex, arrow keys, FormData and form reset in a group', async () => {
    const form = await mount<HTMLFormElement>(`
      <form>
        <k-radio-group name="plan" value="pro" required>
          <k-radio value="free">Free</k-radio>
          <k-radio value="pro">Pro</k-radio>
          <k-radio value="enterprise">Enterprise</k-radio>
        </k-radio-group>
      </form>
    `);
    const group = form.querySelector('k-radio-group') as KRadioGroup;
    const radios = [...group.querySelectorAll('k-radio')] as KRadio[];

    expect(radios[1]!.checked).toBe(true);
    expect(new FormData(form).get('plan')).toBe('pro');
    expect(radios[1]!.shadowRoot!.querySelector('button')!.tabIndex).toBe(0);
    expect(radios[0]!.shadowRoot!.querySelector('button')!.tabIndex).toBe(-1);

    const onChange = vi.fn();
    group.addEventListener('change', onChange);

    radios[1]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    await group.updateComplete;
    await Promise.all(radios.map((r) => r.updateComplete));

    expect(group.value).toBe('enterprise');
    expect(radios[2]!.checked).toBe(true);
    expect(radios[1]!.checked).toBe(false);
    expect(new FormData(form).get('plan')).toBe('enterprise');
    expect(onChange).toHaveBeenCalledOnce();

    form.reset();
    await group.updateComplete;
    await Promise.all(radios.map((r) => r.updateComplete));
    expect(group.value).toBe('pro');
    expect(radios[1]!.checked).toBe(true);
  });

  it('coordinates standalone <k-radio> peers sharing the same name', async () => {
    const form = await mount<HTMLFormElement>(`
      <form>
        <k-radio name="tier" value="a" checked>A</k-radio>
        <k-radio name="tier" value="b">B</k-radio>
      </form>
    `);
    const [a, b] = [...form.querySelectorAll('k-radio')] as [KRadio, KRadio];
    expect(new FormData(form).get('tier')).toBe('a');

    b.click();
    await Promise.all([a.updateComplete, b.updateComplete]);
    expect(a.checked).toBe(false);
    expect(b.checked).toBe(true);
    expect(new FormData(form).get('tier')).toBe('b');
  });
});
