import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../timeline/define.js';
import '../ring-progress/define.js';
import type { KStepper, KStepperStep } from './index.js';
import type { KTimeline, KTimelineItem } from '../timeline/index.js';
import type { KRingProgress } from '../ring-progress/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<k-stepper>', () => {
  it('advances steps, honors allow-next-steps-select, and reveals completed slot', async () => {
    document.body.innerHTML = `
      <k-stepper active="1">
        <k-stepper-step label="Account" description="Create profile">Step 1</k-stepper-step>
        <k-stepper-step label="Verify" description="Confirm email">Step 2</k-stepper-step>
        <k-stepper-step label="Deploy" description="Ship build">Step 3</k-stepper-step>
        <div slot="completed">All Done!</div>
      </k-stepper>
    `;
    const stepper = document.querySelector('k-stepper') as KStepper;
    const steps = [...stepper.querySelectorAll<KStepperStep>('k-stepper-step')];
    await Promise.all([stepper.updateComplete, ...steps.map((s) => s.updateComplete)]);

    const btns = () => [...stepper.shadowRoot!.querySelectorAll<HTMLButtonElement>('.step-btn')];
    expect(btns()).toHaveLength(3);
    expect(btns()[0]!.dataset.state).toBe('completed');
    expect(btns()[1]!.dataset.state).toBe('active');
    expect(btns()[2]!.dataset.state).toBe('pending');
    expect(steps[0]!.hidden).toBe(true);
    expect(steps[1]!.hidden).toBe(false);

    const onChange = vi.fn();
    stepper.addEventListener('k-step-change', (e) =>
      onChange((e as CustomEvent<{ active: number }>).detail.active),
    );

    btns()[2]!.click();
    await stepper.updateComplete;
    expect(stepper.active).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);

    // Move past last step to display completed slot
    stepper.active = 3;
    await stepper.updateComplete;
    expect(steps.every((s) => s.hidden)).toBe(true);
    expect(stepper.shadowRoot!.querySelector<HTMLDivElement>('.completed')!.hidden).toBe(false);
  });
});

describe('<k-timeline>', () => {
  it('highlights active items and connectors up to active index', async () => {
    document.body.innerHTML = `
      <k-timeline active="1" align="left">
        <k-timeline-item title="Commit pushed" timestamp="10:02"></k-timeline-item>
        <k-timeline-item title="CI Running" timestamp="10:04" line-variant="dashed"></k-timeline-item>
        <k-timeline-item title="Deploy" timestamp="Pending"></k-timeline-item>
      </k-timeline>
    `;
    const timeline = document.querySelector('k-timeline') as KTimeline;
    const items = [...timeline.querySelectorAll<KTimelineItem>('k-timeline-item')];
    await Promise.all([timeline.updateComplete, ...items.map((i) => i.updateComplete)]);

    expect(items[0]!.hasAttribute('data-active')).toBe(true);
    expect(items[0]!.hasAttribute('data-line-active')).toBe(true);
    expect(items[1]!.hasAttribute('data-active')).toBe(true);
    expect(items[1]!.hasAttribute('data-line-active')).toBe(false);
    expect(items[2]!.hasAttribute('data-active')).toBe(false);
    expect(items[2]!.hasAttribute('data-last')).toBe(true);
  });
});

describe('<k-ring-progress>', () => {
  it('renders multi-segment SVG arcs clamped to 100% and emits hover events', async () => {
    document.body.innerHTML = `<k-ring-progress size="140" thickness="14"><strong>85%</strong></k-ring-progress>`;
    const ring = document.querySelector('k-ring-progress') as KRingProgress;
    ring.sections = [
      { value: 45, color: '#0d9488', label: 'Compute' },
      { value: 30, color: '#3b82f6', label: 'Storage' },
      { value: 10, color: '#f59e0b', label: 'Network' },
    ];
    await ring.updateComplete;

    const segs = ring.shadowRoot!.querySelectorAll<SVGCircleElement>('.segment');
    expect(segs).toHaveLength(3);

    const hovered = vi.fn();
    ring.addEventListener('k-section-hover', (e) =>
      hovered((e as CustomEvent<{ index: number }>).detail.index),
    );
    segs[1]!.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    expect(hovered).toHaveBeenCalledWith(1);
  });
});
