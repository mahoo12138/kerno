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
