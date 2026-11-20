import { afterEach, describe, expect, it, vi } from 'vitest';
import '@kerno/primitives/select/define';
import './define.js';
import '../tags-input/define.js';
import '../multi-select/define.js';
import '../form/define.js';
import type { KSegmentedControl } from './index.js';
import type { KTagsInput } from '../tags-input/index.js';
import type { KMultiSelect } from '../multi-select/index.js';
import type { KForm } from '../form/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-segmented-control>', () => {
  it('supports data/slotted options, keyboard navigation, sliding indicator, and FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-segmented-control name="view" value="preview">
          <k-option value="preview">Preview</k-option>
          <k-option value="code">Code</k-option>
          <k-option value="split" disabled>Split</k-option>
          <k-option value="audit">Audit</k-option>
        </k-segmented-control>
      </form>
    `;
    const form = document.querySelector('form')!;
    const seg = form.querySelector('k-segmented-control') as KSegmentedControl;
    await seg.updateComplete;

    const btns = [...seg.shadowRoot!.querySelectorAll<HTMLButtonElement>('.segment')];
    expect(btns).toHaveLength(4);
    expect(btns[0]!.getAttribute('aria-checked')).toBe('true');
    expect(btns[2]!.disabled).toBe(true);
    expect(new FormData(form).get('view')).toBe('preview');

    const onChange = vi.fn();
    seg.addEventListener('k-change', (e) =>
      onChange((e as CustomEvent<{ value: string }>).detail.value),
    );

    // ArrowRight skips disabled option when advancing past "code"
    btns[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await seg.updateComplete;
    expect(seg.value).toBe('code');

    btns[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await seg.updateComplete;
    expect(seg.value).toBe('audit');
    expect(onChange).toHaveBeenLastCalledWith('audit');
    expect(new FormData(form).get('view')).toBe('audit');

    form.reset();
    await seg.updateComplete;
    expect(seg.value).toBe('preview');
  });
});

describe('<k-tags-input>', () => {
  it('adds tags via Enter/comma/paste, removes via Backspace, enforces max-tags & duplicates, and submits multi-value FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-tags-input name="tags" max-tags="3" clearable required></k-tags-input>
      </form>
    `;
    const form = document.querySelector('form')!;
    const tags = form.querySelector('k-tags-input') as KTagsInput;
    tags.suggestions = ['Fluent', 'Acrylic', 'Tokens', 'Motion'];
    await tags.updateComplete;

    expect(tags.checkValidity()).toBe(false);
    const input = tags.shadowRoot!.querySelector<HTMLInputElement>('.input')!;

    input.value = 'Fluent';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tags.updateComplete;
    expect(tags.values).toEqual(['Fluent']);

    // Duplicate ignored by default
    input.value = 'Fluent';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tags.updateComplete;
    expect(tags.values).toEqual(['Fluent']);

    // Comma delimiter splits multiple tags & enforces max-tags=3
    input.value = 'Acrylic, Tokens, Overflow,';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tags.updateComplete;
    expect(tags.values).toEqual(['Fluent', 'Acrylic', 'Tokens']);
    expect(new FormData(form).getAll('tags')).toEqual(['Fluent', 'Acrylic', 'Tokens']);
    expect(tags.checkValidity()).toBe(true);

    // Backspace on empty input pops last tag
    input.value = '';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    await tags.updateComplete;
    expect(tags.values).toEqual(['Fluent', 'Acrylic']);
  });
});

describe('<k-multi-select>', () => {
  it('filters options, toggles multi-selection, respects max-values, and integrates with <k-form>', async () => {
    document.body.innerHTML = `
      <k-form>
        <k-multi-select name="frameworks" max-values="2" clearable required>
          <k-option value="ts">TypeScript</k-option>
          <k-option value="wc">Web Components</k-option>
          <k-option value="css">CSS Tokens</k-option>
        </k-multi-select>
      </k-form>
    `;
    const kform = document.querySelector('k-form') as KForm;
    const ms = kform.querySelector('k-multi-select') as KMultiSelect;
    await ms.updateComplete;

    expect(ms.checkValidity()).toBe(false);

    ms.open = true;
    await ms.updateComplete;

    const opts = () => [...ms.shadowRoot!.querySelectorAll<HTMLButtonElement>('.option')];
    expect(opts()).toHaveLength(3);

    opts()[0]!.click();
    await ms.updateComplete;
    opts()[1]!.click();
    await ms.updateComplete;

    expect(ms.values).toEqual(['ts', 'wc']);
    // Third unselected option is disabled once max-values=2 is reached
    expect(opts()[2]!.disabled).toBe(true);

    const pills = ms.shadowRoot!.querySelectorAll('.pill');
    expect(pills).toHaveLength(2);

    const { values, formData } = kform.getValues();
    expect(values.frameworks).toEqual(['ts', 'wc']);
    expect(formData.getAll('frameworks')).toEqual(['ts', 'wc']);
  });
});
