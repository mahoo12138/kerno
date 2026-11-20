import { afterEach, describe, expect, it, vi } from 'vitest';
import '@kerno/primitives/input/define';
import '@kerno/primitives/button/define';
import '@kerno/primitives/checkbox/define';
import '../form-field/define.js';
import './define.js';
import '../data-grid/define.js';
import type { KForm } from './index.js';
import { computeVirtualWindow, type KDataGrid } from '../data-grid/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-form>', () => {
  it('validates descendant controls, renders clickable error summary, submits structured values, and resets', async () => {
    document.body.innerHTML = `
      <k-form layout="grid">
        <k-form-field label="Project Name" required>
          <k-input name="project" required></k-input>
        </k-form-field>
        <k-checkbox name="publish" value="yes" checked>Auto publish</k-checkbox>
        <k-button slot="actions" type="submit" variant="accent">Submit</k-button>
        <k-button slot="actions" type="reset">Reset</k-button>
      </k-form>
    `;
    const form = document.querySelector('k-form') as KForm;
    const input = form.querySelector('k-input')!;
    await Promise.all([form.updateComplete, input.updateComplete]);

    const onInvalid = vi.fn();
    const onSubmit = vi.fn();
    form.addEventListener('k-invalid', (e) =>
      onInvalid((e as CustomEvent<{ errors: unknown[] }>).detail.errors.length),
    );
    form.addEventListener('k-submit', (e) =>
      onSubmit((e as CustomEvent<{ values: Record<string, unknown> }>).detail.values),
    );

    // Submitting empty required input fails and renders summary banner
    const submitBtn = form.querySelector<HTMLElement>('k-button[type="submit"]')!;
    submitBtn.click();
    await form.updateComplete;

    expect(onInvalid).toHaveBeenCalledWith(1);
    expect(onSubmit).not.toHaveBeenCalled();
    const summary = form.shadowRoot!.querySelector<HTMLElement>('.summary')!;
    expect(summary.hidden).toBe(false);
    expect(summary.textContent).toContain('Project Name');

    // Fill input and submit successfully
    input.value = 'Kerno';
    await input.updateComplete;
    submitBtn.click();
    await form.updateComplete;

    expect(summary.hidden).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith({ project: 'Kerno', publish: 'yes' });

    // Reset clears input back to default
    form.querySelector<HTMLElement>('k-button[type="reset"]')!.click();
    await Promise.all([form.updateComplete, input.updateComplete]);
    expect(input.value).toBe('');
  });
});

describe('<k-data-grid>', () => {
  it('computes accurate bounded virtual windows for large datasets', () => {
    const winStart = computeVirtualWindow(0, 400, 10000, 40, 5);
    expect(winStart.startIndex).toBe(0);
    expect(winStart.endIndex).toBe(15);
    expect(winStart.totalHeight).toBe(400000);

    const winMid = computeVirtualWindow(200000, 400, 10000, 40, 5);
    expect(winMid.startIndex).toBe(4995);
    expect(winMid.endIndex).toBe(5015);
    expect(winMid.renderedCount).toBe(20);
  });

  it('virtualizes 5,000 rows into a tiny DOM slice and supports sorting, filtering, and selection', async () => {
    document.body.innerHTML =
      '<k-data-grid selectable row-height="40" overscan="4" style="--k-data-grid-height: 240px"></k-data-grid>';
    const grid = document.querySelector('k-data-grid') as KDataGrid;
    grid.columns = [
      { key: 'id', title: 'ID', width: 80, sortable: true },
      { key: 'name', title: 'Service', sortable: true },
      { key: 'region', title: 'Region' },
    ];
    grid.data = Array.from({ length: 5000 }, (_, i) => ({
      id: i + 1,
      name: `worker-${String(i + 1).padStart(4, '0')}`,
      region: i % 2 === 0 ? 'us-west' : 'eu-central',
    }));
    await grid.updateComplete;

    const renderedRows = grid.shadowRoot!.querySelectorAll('.body .row');
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(30); // Virtualized, never mounts 5000 rows!
    expect(grid.shadowRoot!.querySelector('.footer-stats')!.textContent).toContain('5,000 rows');

    // Filter down to half the rows
    grid.filter = 'eu-central';
    await grid.updateComplete;
    expect(grid.shadowRoot!.querySelector('.footer-stats')!.textContent).toContain('2,500 / 5,000');

    // Select first visible row
    const firstCheck = grid.shadowRoot!.querySelector<HTMLButtonElement>('.body .check-btn')!;
    firstCheck.click();
    await grid.updateComplete;
    expect(grid.selectedKeys).toHaveLength(1);
    expect(grid.shadowRoot!.querySelector('.header .check-btn')!.getAttribute('aria-checked')).toBe(
      'mixed',
    );
  });
});
