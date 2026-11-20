import { afterEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import '../toast/define.js';
import type { KAlert } from './index.js';
import { toast, type KToast } from '../toast/index.js';

afterEach(() => {
  toast.clear();
  document.body.innerHTML = '';
});

describe('<k-alert>', () => {
  it('assigns role="status" for info/success and role="alert" for warning/danger', async () => {
    document.body.innerHTML = `
      <k-alert id="a1" variant="info" title="Heads up">Sync active.</k-alert>
      <k-alert id="a2" variant="danger" title="Error">Connection lost.</k-alert>
    `;
    const a1 = document.getElementById('a1') as KAlert;
    const a2 = document.getElementById('a2') as KAlert;
    await Promise.all([a1.updateComplete, a2.updateComplete]);

    expect(a1.shadowRoot!.querySelector('.base')!.getAttribute('role')).toBe('status');
    expect(a2.shadowRoot!.querySelector('.base')!.getAttribute('role')).toBe('alert');
    expect(a1.shadowRoot!.querySelector('.title-fallback')!.textContent).toBe('Heads up');
  });

  it('respects cancelable k-close before dismissing', async () => {
    document.body.innerHTML = '<k-alert closable title="Closable">Message</k-alert>';
    const alert = document.querySelector('k-alert') as KAlert;
    await alert.updateComplete;

    let allow = false;
    alert.addEventListener('k-close', (e) => {
      if (!allow) e.preventDefault();
    });

    const btn = alert.shadowRoot!.querySelector<HTMLButtonElement>('.close-btn')!;
    btn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(alert.open).toBe(true);

    allow = true;
    const closed = await alert.close();
    expect(closed).toBe(true);
    expect(alert.open).toBe(false);
  });
});

describe('<k-toast> & imperative toast service', () => {
  it('mounts a Top-Layer container, supports actions, and dismisses cleanly', async () => {
    const onAction = vi.fn();
    const handle = toast.success('Saved settings', {
      description: 'All changes synced.',
      duration: 0,
      actionLabel: 'Undo',
      onAction,
      placement: 'top-end',
    });

    const container = document.querySelector('k-toast-container[data-k-toast-singleton]')!;
    expect(container).not.toBeNull();
    expect(container.getAttribute('placement')).toBe('top-end');

    const el = container.querySelector('k-toast') as KToast;
    await el.updateComplete;
    expect(el.variant).toBe('success');
    expect(el.shadowRoot!.querySelector('.title')!.textContent).toBe('Saved settings');

    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    expect(onAction).toHaveBeenCalledOnce();

    handle.dismiss();
    await handle.closed;
    expect(container.querySelectorAll('k-toast')).toHaveLength(0);
  });

  it('pauses auto-dismiss while hovered and resumes after pointerleave', async () => {
    const handle = toast.info('Auto dismiss', { duration: 120 });
    const el = document.querySelector('k-toast') as KToast;
    await el.updateComplete;

    // Wait briefly so timer starts, then hover to pause
    await new Promise((r) => setTimeout(r, 25));
    el.dispatchEvent(new PointerEvent('pointerenter'));
    expect(el.hasAttribute('data-paused')).toBe(true);

    // Wait longer than original duration while paused
    await new Promise((r) => setTimeout(r, 150));
    expect(el.open).toBe(true);

    // Resume on pointerleave and expect dismissal
    el.dispatchEvent(new PointerEvent('pointerleave'));
    expect(el.hasAttribute('data-paused')).toBe(false);
    await handle.closed;
    expect(el.isConnected).toBe(false);
  });
});
