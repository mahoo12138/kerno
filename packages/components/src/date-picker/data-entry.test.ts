import { afterEach, describe, expect, it, vi } from 'vitest';
import '../autocomplete/define.js';
import './define.js';
import '../upload/define.js';
import type { KAutocomplete } from '../autocomplete/index.js';
import { buildMonthGrid, parseIsoDate, type KDatePicker } from './index.js';
import type { KUpload } from '../upload/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-autocomplete>', () => {
  it('filters options, selects via keyboard, submits FormData, and clears cleanly', async () => {
    document.body.innerHTML = `
      <form>
        <k-autocomplete name="framework" clearable required>
          <k-option value="wc">Web Components</k-option>
          <k-option value="react">React</k-option>
          <k-option value="vue">Vue</k-option>
        </k-autocomplete>
      </form>
    `;
    const form = document.querySelector('form')!;
    const ac = form.querySelector('k-autocomplete') as KAutocomplete;
    await ac.updateComplete;

    expect(ac.checkValidity()).toBe(false);

    const input = ac.shadowRoot!.querySelector<HTMLInputElement>('.input')!;
    input.focus();
    input.value = 'web';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await ac.updateComplete;

    const opts = ac.shadowRoot!.querySelectorAll('.option');
    expect(opts).toHaveLength(1);
    expect(opts[0]!.textContent).toBe('Web Components');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await ac.updateComplete;

    expect(ac.value).toBe('wc');
    expect(ac.open).toBe(false);
    expect(ac.checkValidity()).toBe(true);
    expect(new FormData(form).get('framework')).toBe('wc');

    ac.shadowRoot!.querySelector<HTMLButtonElement>('.clear-btn')!.click();
    await ac.updateComplete;
    expect(ac.value).toBe('');
    expect(new FormData(form).get('framework')).toBeNull();
  });
});

describe('<k-date-picker>', () => {
  it('validates ISO calendar dates and builds fixed 42-cell month grids', () => {
    expect(parseIsoDate('2026-02-28')).toEqual({ year: 2026, month: 2, day: 28 });
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });

    const grid = buildMonthGrid(2026, 11, 1);
    expect(grid).toHaveLength(42);
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30);
  });

  it('supports single date selection, min/max bounds, range picking with auto-swap, and FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-date-picker id="single" name="release" value="2026-11-10" min="2026-11-05" max="2026-11-25"></k-date-picker>
        <k-date-picker id="range" name="window" mode="range" start-value="2026-11-10" end-value="2026-11-14"></k-date-picker>
      </form>
    `;
    const form = document.querySelector('form')!;
    const single = document.getElementById('single') as KDatePicker;
    const range = document.getElementById('range') as KDatePicker;
    await Promise.all([single.updateComplete, range.updateComplete]);

    expect(new FormData(form).get('release')).toBe('2026-11-10');
    expect(new FormData(form).get('window')).toBe('2026-11-10..2026-11-14');

    // Open single picker and verify out-of-bounds day is disabled
    single.open = true;
    await single.updateComplete;
    const disabledDay = single.shadowRoot!.querySelector<HTMLButtonElement>(
      'button[data-iso="2026-11-03"]',
    )!;
    expect(disabledDay.disabled).toBe(true);

    single.shadowRoot!.querySelector<HTMLButtonElement>('button[data-iso="2026-11-18"]')!.click();
    await single.updateComplete;
    expect(single.value).toBe('2026-11-18');
    expect(single.open).toBe(false);

    // Open range picker and select end before start -> should auto-swap
    range.open = true;
    await range.updateComplete;
    range.shadowRoot!.querySelector<HTMLButtonElement>('button[data-iso="2026-11-20"]')!.click();
    await range.updateComplete;
    expect(range.open).toBe(true);
    range.shadowRoot!.querySelector<HTMLButtonElement>('button[data-iso="2026-11-12"]')!.click();
    await range.updateComplete;
    expect(range.open).toBe(false);
    expect(range.startValue).toBe('2026-11-12');
    expect(range.endValue).toBe('2026-11-20');
    expect(range.value).toBe('2026-11-12..2026-11-20');
  });
});

describe('<k-upload>', () => {
  it('validates accept/max-size/max-files, tracks progress, and submits File objects in FormData', async () => {
    document.body.innerHTML = `
      <form>
        <k-upload name="assets" accept=".png,.txt" multiple max-size="1024" max-files="2" required></k-upload>
      </form>
    `;
    const form = document.querySelector('form')!;
    const up = form.querySelector('k-upload') as KUpload;
    await up.updateComplete;

    expect(up.checkValidity()).toBe(false);

    const rejects: string[] = [];
    up.addEventListener('k-upload-reject', (e) => {
      rejects.push((e as CustomEvent<{ reason: string }>).detail.reason);
    });

    const ok1 = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const badType = new File(['{}'], 'data.json', { type: 'application/json' });
    const tooBig = new File([new Uint8Array(2048)], 'big.png', { type: 'image/png' });
    const ok2 = new File(['img'], 'icon.png', { type: 'image/png' });
    const extra = new File(['x'], 'third.txt', { type: 'text/plain' });

    const added = up.addFiles([ok1, badType, tooBig, ok2, extra]);
    await up.updateComplete;

    expect(added).toHaveLength(2);
    expect(rejects).toEqual(['type', 'max-size', 'max-files']);
    expect(up.checkValidity()).toBe(true);

    const submitted = new FormData(form).getAll('assets');
    expect(submitted).toHaveLength(2);
    expect((submitted[0] as File).name).toBe('notes.txt');

    up.setFileProgress(added[0]!.id, 65);
    expect(up.files[0]!.status).toBe('uploading');
    up.setFileStatus(added[0]!.id, 'done');
    expect(up.files[0]!.progress).toBe(100);

    const onRemove = vi.fn();
    up.addEventListener('k-upload-remove', onRemove);
    up.removeFile(added[0]!.id);
    await up.updateComplete;
    expect(up.files).toHaveLength(1);
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
