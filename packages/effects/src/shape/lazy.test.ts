import { afterEach, describe, expect, it, vi } from 'vitest';
import { KernoElement, define, prop, type PropertyValues } from '@kerno/core';
import { LazyShapeOutlineController, loadShapeOutline } from './lazy.js';

class ShapedBox extends KernoElement {
  static override template =
    '<div class="target" style="width: 80px; height: 32px; border-radius: 6px"></div>';

  @prop({ reflect: true }) accessor shape = 'rounded';

  readonly outline = new LazyShapeOutlineController(this, {
    getTarget: () => this.renderRoot.querySelector<HTMLElement>('.target'),
    getKind: () => this.shape,
  });

  get target(): HTMLElement {
    return this.renderRoot.querySelector<HTMLElement>('.target')!;
  }

  protected override update(changed: PropertyValues): void {
    if (changed.has('shape')) this.outline.sync();
  }
}
define('test-shaped-box', ShapedBox);

const mount = async (html: string): Promise<ShapedBox> => {
  document.body.innerHTML = html;
  const el = document.querySelector('test-shaped-box') as ShapedBox;
  await el.updateComplete;
  return el;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('LazyShapeOutlineController', () => {
  it('keeps rounded shapes on pure CSS without activating the renderer', async () => {
    const el = await mount('<test-shaped-box></test-shaped-box>');
    expect(el.outline.active).toBeNull();
    expect(el.target.style.clipPath).toBe('');
    expect(el.target.querySelector('.shape-stroke')).toBeNull();
  });

  it('loads the renderer on demand for non-rounded shapes and hands over to it', async () => {
    const el = await mount('<test-shaped-box></test-shaped-box>');
    el.shape = 'chamfer';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.target.style.clipPath).toContain('path('));
    expect(el.outline.active).not.toBeNull();
    expect(el.target.querySelector('.shape-stroke')).not.toBeNull();

    el.shape = 'rounded';
    await el.updateComplete;
    expect(el.target.style.clipPath).toBe('');
    expect(el.target.querySelector('.shape-stroke')).toBeNull();
  });

  it('activates synchronously once the renderer has been loaded', async () => {
    await loadShapeOutline();
    const el = await mount('<test-shaped-box shape="notch"></test-shaped-box>');
    expect(el.outline.active).not.toBeNull();
    expect(el.target.style.clipPath).toContain('path(');
  });

  it('activates for parametric CSS features and opt-in effects', async () => {
    await loadShapeOutline();
    document.body.innerHTML = `
      <test-shaped-box style="--k-edge-kind: arc; --k-edge-depth: 4px"></test-shaped-box>
      <test-shaped-box reveal></test-shaped-box>
      <test-shaped-box reveal no-reveal></test-shaped-box>
    `;
    const boxes = [...document.querySelectorAll<ShapedBox>('test-shaped-box')];
    await Promise.all(boxes.map((box) => box.updateComplete));
    const [edged, revealed, optedOut] = boxes;
    expect(edged!.outline.active).not.toBeNull();
    expect(revealed!.outline.active).not.toBeNull();
    expect(optedOut!.outline.active).toBeNull();
  });
});
