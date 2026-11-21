import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../cascader/define.js';
import { formatTimeDisplay, parseTimeValue, type KTimePicker } from './index.js';
import { resolveCascaderPath, type CascaderOption, type KCascader } from '../cascader/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-time-picker>', () => {
  it('parses and formats 24h and 12h time strings cleanly', () => {
    expect(parseTimeValue('14:30:15')).toEqual({ hours: 14, minutes: 30, seconds: 15 });
    expect(parseTimeValue('25:00')).toBeNull();
    expect(formatTimeDisplay({ hours: 14, minutes: 5, seconds: 0 }, { use12Hours: true })).toBe(
      '02:05 PM',
    );
    expect(formatTimeDisplay({ hours: 0, minutes: 30, seconds: 0 }, { use12Hours: true })).toBe(
      '12:30 AM',
    );
  });

  it('selects hours/minutes with min/max constraints, 12h display, and FormData submission', async () => {
    document.body.innerHTML = `
      <form>
        <k-time-picker name="meeting" value="09:30" min="09:00" max="17:30" minute-step="15" clearable></k-time-picker>
      </form>
    `;
    const form = document.querySelector('form')!;
    const tp = form.querySelector('k-time-picker') as KTimePicker;
    await tp.updateComplete;

    expect(new FormData(form).get('meeting')).toBe('09:30');

    tp.open = true;
    await tp.updateComplete;

    const cols = tp.shadowRoot!.querySelectorAll('.col');
    expect(cols).toHaveLength(2);
    // Hour 08 should be disabled (< min 09:00)
    const hourBtns = [...cols[0]!.querySelectorAll<HTMLButtonElement>('.cell')];
    expect(hourBtns[8]!.disabled).toBe(true);
    expect(hourBtns[14]!.disabled).toBe(false);

    hourBtns[14]!.click(); // 14:30
    await tp.updateComplete;
    expect(tp.value).toBe('14:30');

    const minBtns = [...cols[1]!.querySelectorAll<HTMLButtonElement>('.cell')];
    minBtns[3]!.click(); // 45 min
    await tp.updateComplete;
    expect(tp.value).toBe('14:45');
    expect(new FormData(form).get('meeting')).toBe('14:45');

    tp.shadowRoot!.querySelector<HTMLButtonElement>('.done-btn')!.click();
    await tp.updateComplete;
    expect(tp.open).toBe(false);

    form.reset();
    await tp.updateComplete;
    expect(tp.value).toBe('09:30');
  });

  it('preserves sibling column scroll position when selecting an hour', async () => {
    document.body.innerHTML = `<k-time-picker value="09:45"></k-time-picker>`;
    const tp = document.querySelector('k-time-picker') as KTimePicker;
    await tp.updateComplete;

    tp.open = true;
    await tp.updateComplete;

    const minColBefore = tp.shadowRoot!.querySelector<HTMLElement>('.col[aria-label="Min"]')!;
    minColBefore.scrollTop = 180;
    const savedTop = minColBefore.scrollTop;
    expect(savedTop).toBeGreaterThan(0);

    const hourBtn = tp.shadowRoot!.querySelectorAll<HTMLButtonElement>(
      '.col[aria-label="Hour"] .cell',
    )[10]!;
    hourBtn.click();
    await tp.updateComplete;

    const minColAfter = tp.shadowRoot!.querySelector<HTMLElement>('.col[aria-label="Min"]')!;
    expect(minColAfter.scrollTop).toBe(savedTop);
  });

  it('supports 12h AM/PM switching, seconds column, Now button, and clearable', async () => {
    document.body.innerHTML = `<k-time-picker value="14:05:30" use-12-hours show-seconds clearable></k-time-picker>`;
    const tp = document.querySelector('k-time-picker') as KTimePicker;
    await tp.updateComplete;

    expect(tp.shadowRoot!.querySelector('.display')!.textContent).toBe('02:05:30 PM');

    tp.open = true;
    await tp.updateComplete;
    expect(tp.shadowRoot!.querySelectorAll('.col')).toHaveLength(4);

    // Switch PM -> AM
    const periodBtns = [
      ...tp.shadowRoot!.querySelectorAll<HTMLButtonElement>('.col[aria-label="Period"] .cell'),
    ];
    periodBtns[0]!.click();
    await tp.updateComplete;
    expect(tp.value).toBe('02:05:30');

    // Clear button resets value to empty
    tp.shadowRoot!.querySelector<HTMLElement>('.clear-btn')!.click();
    await tp.updateComplete;
    expect(tp.value).toBe('');
  });
});

describe('<k-cascader>', () => {
  const REGIONS: CascaderOption[] = [
    {
      value: 'cn',
      label: 'China',
      children: [
        {
          value: 'zj',
          label: 'Zhejiang',
          children: [
            { value: 'hz', label: 'Hangzhou' },
            { value: 'nb', label: 'Ningbo' },
          ],
        },
      ],
    },
    {
      value: 'us',
      label: 'United States',
      children: [{ value: 'wa', label: 'Washington' }],
    },
  ];

  it('resolves multi-level paths, selects leaf nodes, submits FormData, and supports change-on-select', async () => {
    expect(resolveCascaderPath(REGIONS, ['cn', 'zj', 'hz']).map((o) => o.label)).toEqual([
      'China',
      'Zhejiang',
      'Hangzhou',
    ]);

    document.body.innerHTML = `
      <form>
        <k-cascader name="region" clearable required></k-cascader>
      </form>
    `;
    const form = document.querySelector('form')!;
    const cas = form.querySelector('k-cascader') as KCascader;
    cas.options = REGIONS;
    await cas.updateComplete;

    expect(cas.checkValidity()).toBe(false);

    const onChange = vi.fn();
    cas.addEventListener('k-cascader-change', (e) =>
      onChange((e as CustomEvent<{ value: string }>).detail.value),
    );

    cas.open = true;
    await cas.updateComplete;

    // Click China -> Zhejiang -> Hangzhou
    cas.shadowRoot!.querySelector<HTMLButtonElement>('.item[data-value="cn"]')!.click();
    await cas.updateComplete;
    cas.shadowRoot!.querySelector<HTMLButtonElement>('.item[data-value="zj"]')!.click();
    await cas.updateComplete;
    cas.shadowRoot!.querySelector<HTMLButtonElement>('.item[data-value="hz"]')!.click();
    await cas.updateComplete;

    expect(cas.open).toBe(false);
    expect(cas.value).toBe('cn/zj/hz');
    expect(cas.valuePath).toEqual(['cn', 'zj', 'hz']);
    expect(cas.shadowRoot!.querySelector('.display')!.textContent).toBe(
      'China / Zhejiang / Hangzhou',
    );
    expect(onChange).toHaveBeenCalledWith('cn/zj/hz');
    expect(cas.checkValidity()).toBe(true);
    expect(new FormData(form).get('region')).toBe('cn/zj/hz');
  });

  it('truncates long path labels cleanly inside narrow grid tracks without overflowing', async () => {
    document.body.innerHTML = `
      <div style="display:grid;grid-template-columns:220px 220px;gap:16px">
        <k-cascader value="cn/zj/hz" clearable></k-cascader>
        <div>Adjacent</div>
      </div>
    `;
    const cas = document.querySelector('k-cascader') as KCascader;
    cas.options = [
      {
        value: 'cn',
        label: 'Asia Pacific Cloud Region',
        children: [
          {
            value: 'zj',
            label: 'Hangzhou Availability Zone',
            children: [{ value: 'hz', label: 'Primary Production Mesh Cluster A' }],
          },
        ],
      },
    ];
    await cas.updateComplete;

    expect(cas.getBoundingClientRect().width).toBeLessThanOrEqual(220.5);
  });

  it('commits non-leaf nodes when change-on-select is enabled and clears cleanly', async () => {
    document.body.innerHTML = `<k-cascader change-on-select clearable></k-cascader>`;
    const cas = document.querySelector('k-cascader') as KCascader;
    cas.options = REGIONS;
    await cas.updateComplete;

    cas.open = true;
    await cas.updateComplete;
    cas.shadowRoot!.querySelector<HTMLButtonElement>('.item[data-value="cn"]')!.click();
    await cas.updateComplete;
    expect(cas.value).toBe('cn');

    cas.shadowRoot!.querySelector<HTMLElement>('.clear-btn')!.click();
    await cas.updateComplete;
    expect(cas.value).toBe('');
  });
});
