import { afterEach, describe, expect, it, vi } from 'vitest';
import '../badge/define.js';
import '../separator/define.js';
import './define.js';
import type { KOption, KSelect } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-select>, <k-badge> & <k-separator>', () => {
  it('selects options, submits FormData, validates required and resets cleanly', async () => {
    document.body.innerHTML = `
      <form>
        <k-select name="role" required placeholder="Pick role">
          <k-option value="dev">Developer</k-option>
          <k-option value="design">Designer</k-option>
        </k-select>
      </form>
    `;
    const form = document.querySelector('form')!;
    const select = form.querySelector('k-select') as KSelect;
    const options = [...select.querySelectorAll('k-option')] as KOption[];
    await Promise.all([select.updateComplete, ...options.map((o) => o.updateComplete)]);

    expect(select.checkValidity()).toBe(false);
    expect(new FormData(form).get('role')).toBeNull();

    const onChange = vi.fn();
    select.addEventListener('change', onChange);

    options[1]!.click();
    await Promise.all([select.updateComplete, ...options.map((o) => o.updateComplete)]);

    expect(select.value).toBe('design');
    expect(options[1]!.selected).toBe(true);
    expect(select.checkValidity()).toBe(true);
    expect(new FormData(form).get('role')).toBe('design');
    expect(onChange).toHaveBeenCalledOnce();

    form.reset();
    await select.updateComplete;
    expect(select.value).toBe('');
    expect(new FormData(form).get('role')).toBeNull();
  });

  it('positions listbox overlay directly over the trigger without drifting across multiple opens', async () => {
    document.body.innerHTML = `
      <div style="margin-top: 240px; margin-left: 120px">
        <k-select value="b">
          <k-option value="a">Option A</k-option>
          <k-option value="b">Option B</k-option>
          <k-option value="c">Option C</k-option>
        </k-select>
      </div>
    `;
    const select = document.querySelector('k-select') as KSelect;
    const options = [...select.querySelectorAll('k-option')] as KOption[];
    await Promise.all([select.updateComplete, ...options.map((o) => o.updateComplete)]);

    const combobox = select.shadowRoot!.querySelector<HTMLElement>('.combobox')!;
    const listbox = select.shadowRoot!.querySelector<HTMLElement>('.listbox')!;

    for (let cycle = 0; cycle < 3; cycle++) {
      select.open = true;
      await select.updateComplete;

      const triggerRect = combobox.getBoundingClientRect();
      const listboxTop = Number.parseFloat(listbox.style.top);
      const listboxLeft = Number.parseFloat(listbox.style.left);

      // Option B (index 1, 32px after index 0 + 5px top border/padding = 37px) sits directly over triggerRect.top
      expect(listboxLeft).toBeCloseTo(triggerRect.left, 0);
      expect(listboxTop).toBeCloseTo(triggerRect.top - 37, 0);

      select.open = false;
      await select.updateComplete;
    }
  });

  it('renders <k-badge> and <k-separator> with proper ARIA roles', async () => {
    document.body.innerHTML = `
      <div>
        <k-badge variant="success" pill>Active</k-badge>
        <k-separator orientation="vertical"></k-separator>
      </div>
    `;
    const sep = document.querySelector('k-separator')!;
    await sep.updateComplete;
    expect(sep.getAttribute('role')).toBe('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('vertical');
  });
});
