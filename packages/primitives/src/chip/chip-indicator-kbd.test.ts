import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../indicator/define.js';
import '../kbd/define.js';
import type { KChip, KChipGroup } from './index.js';
import type { KIndicator } from '../indicator/index.js';
import type { KKbd } from '../kbd/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-chip> & <k-chip-group>', () => {
  it('toggles standalone chip and submits FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-chip name="beta" value="yes">Beta Features</k-chip>
      </form>
    `;
    const form = document.querySelector('form')!;
    const chip = form.querySelector('k-chip') as KChip;
    await chip.updateComplete;

    expect(new FormData(form).get('beta')).toBeNull();
    chip.shadowRoot!.querySelector<HTMLButtonElement>('.chip')!.click();
    await chip.updateComplete;
    expect(chip.checked).toBe(true);
    expect(new FormData(form).get('beta')).toBe('yes');
  });

  it('coordinates single and multiple selection in <k-chip-group>', async () => {
    document.body.innerHTML = `
      <form>
        <k-chip-group name="filters" multiple value="fluent">
          <k-chip value="fluent">Fluent 1</k-chip>
          <k-chip value="acrylic">Acrylic</k-chip>
          <k-chip value="tokens">Tokens</k-chip>
        </k-chip-group>
      </form>
    `;
    const form = document.querySelector('form')!;
    const group = form.querySelector('k-chip-group') as KChipGroup;
    const chips = [...group.querySelectorAll<KChip>('k-chip')];
    await Promise.all([group.updateComplete, ...chips.map((c) => c.updateComplete)]);

    expect(chips[0]!.checked).toBe(true);
    expect(chips[1]!.checked).toBe(false);
    expect(chips[0]!.variant).toBe('filled');

    group.pill = true;
    await group.updateComplete;
    expect(chips[0]!.pill).toBe(true);
    group.pill = false;
    await group.updateComplete;
    expect(chips[0]!.pill).toBe(false);

    const onChange = vi.fn();
    group.addEventListener('k-chip-change', (e) =>
      onChange((e as CustomEvent<{ values: string[] }>).detail.values),
    );

    chips[1]!.shadowRoot!.querySelector<HTMLButtonElement>('.chip')!.click();
    await group.updateComplete;
    expect(group.values).toEqual(['fluent', 'acrylic']);
    expect(onChange).toHaveBeenCalledWith(['fluent', 'acrylic']);
    expect(new FormData(form).getAll('filters')).toEqual(['fluent', 'acrylic']);

    // Switch to single mode -> trims to first selected and acts as radio
    group.multiple = false;
    await group.updateComplete;
    chips[2]!.shadowRoot!.querySelector<HTMLButtonElement>('.chip')!.click();
    await group.updateComplete;
    expect(group.value).toBe('tokens');
    expect(chips[0]!.checked).toBe(false);
    expect(chips[2]!.checked).toBe(true);
  });
});

describe('<k-indicator> & <k-kbd>', () => {
  it('renders positioned indicator badge and semantic kbd keycap', async () => {
    document.body.innerHTML = `
      <k-indicator label="9+" variant="danger" position="top-end" processing>
        <span>Inbox</span>
      </k-indicator>
      <k-kbd size="md">⌘</k-kbd>
    `;
    const ind = document.querySelector('k-indicator') as KIndicator;
    const kbd = document.querySelector('k-kbd') as KKbd;
    await Promise.all([ind.updateComplete, kbd.updateComplete]);

    const badge = ind.shadowRoot!.querySelector<HTMLSpanElement>('.badge')!;
    expect(badge.textContent).toBe('9+');
    expect(badge.classList.contains('has-label')).toBe(true);
    expect(kbd.shadowRoot!.querySelector('kbd')).not.toBeNull();
  });
});
