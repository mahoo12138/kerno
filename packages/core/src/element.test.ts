import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  KernoElement,
  css,
  define,
  emit,
  getActiveElement,
  getTabbableElements,
  prop,
  state,
  type PropertyValues,
  type ReactiveController,
} from './index.js';

let seq = 0;
const tag = (base: string) => `test-${base}-${++seq}`;

class Counter extends KernoElement {
  static override styles = css`
    :host {
      display: block;
      color: rgb(1, 2, 3);
    }
  `;
  static override template = '<span part="value"></span>';

  @prop({ type: Number, reflect: true }) accessor count = 0;
  @prop({ type: Boolean, reflect: true }) accessor active = false;
  @prop({ attribute: 'data-label' }) accessor label = 'none';
  @prop({ attribute: false }) accessor data: object | null = null;
  @state() accessor internal = 0;

  updates: PropertyValues[] = [];
  setups = 0;
  #value!: HTMLSpanElement;

  protected override setup(): void {
    this.setups++;
    this.#value = this.renderRoot.querySelector('span')!;
  }

  protected override update(changed: PropertyValues): void {
    this.updates.push(new Map(changed));
    this.#value.textContent = `${this.label}:${this.count}`;
  }
}
const counterTag = tag('counter');
define(counterTag, Counter);

const mount = <T extends HTMLElement>(html: string): T => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as T;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('KernoElement', () => {
  it('derives observed attributes from decorators', () => {
    expect(Counter.observedAttributes.sort()).toEqual(['active', 'count', 'data-label']);
  });

  it('stamps the template once and adopts styles', async () => {
    const el = mount<Counter>(`<${counterTag}></${counterTag}>`);
    await el.updateComplete;
    expect(el.renderRoot.querySelector('span')?.textContent).toBe('none:0');
    expect(getComputedStyle(el).color).toBe('rgb(1, 2, 3)');
    el.remove();
    document.body.append(el);
    expect(el.setups).toBe(1);
  });

  it('converts attributes to properties', async () => {
    const el = mount<Counter>(`<${counterTag} count="5" active data-label="hi"></${counterTag}>`);
    expect(el.count).toBe(5);
    expect(el.active).toBe(true);
    expect(el.label).toBe('hi');
    el.removeAttribute('active');
    expect(el.active).toBe(false);
  });

  it('batches property changes into one update and reflects them', async () => {
    const el = mount<Counter>(`<${counterTag}></${counterTag}>`);
    await el.updateComplete;
    el.updates.length = 0;

    el.count = 1;
    el.count = 2;
    el.active = true;
    el.internal = 1;
    expect(el.getAttribute('count')).toBe('0'); // not yet
    await el.updateComplete;

    expect(el.updates).toHaveLength(1);
    expect([...el.updates[0]!.entries()]).toEqual([
      ['count', 0],
      ['active', false],
      ['internal', 0],
    ]);
    expect(el.getAttribute('count')).toBe('2');
    expect(el.hasAttribute('active')).toBe(true);
    expect(el.hasAttribute('internal')).toBe(false);
  });

  it('skips updates when values do not change', async () => {
    const el = mount<Counter>(`<${counterTag}></${counterTag}>`);
    await el.updateComplete;
    el.updates.length = 0;
    el.count = 0;
    await el.updateComplete;
    expect(el.updates).toHaveLength(0);
  });

  it('applies properties set before upgrade', async () => {
    const name = tag('late');
    const el = document.createElement(name) as HTMLElement & { count: number };
    el.count = 7;
    document.body.append(el);
    class Late extends Counter {}
    define(name, Late);
    await (el as unknown as Counter).updateComplete;
    expect(el.count).toBe(7);
    expect(el.getAttribute('count')).toBe('7');
  });

  it('drives reactive controllers', async () => {
    const el = document.createElement(counterTag) as Counter;
    const calls: string[] = [];
    const controller: ReactiveController = {
      hostConnected: () => calls.push('connected'),
      hostUpdate: () => calls.push('update'),
      hostUpdated: () => calls.push('updated'),
      hostDisconnected: () => calls.push('disconnected'),
    };
    el.addController(controller);
    document.body.append(el);
    await el.updateComplete;
    el.remove();
    expect(calls).toEqual(['connected', 'update', 'updated', 'disconnected']);
  });
});

describe('define', () => {
  it('is idempotent for the same class', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => define(counterTag, Counter)).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns instead of throwing on conflicting classes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class Other extends KernoElement {}
    define(counterTag, Other);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('registers one class under several tag names', () => {
    const alias = tag('alias');
    define(alias, Counter);
    const el = document.createElement(alias);
    expect(el).toBeInstanceOf(Counter);
  });
});

describe('emit', () => {
  it('dispatches bubbling, composed, cancelable events', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const listener = vi.fn((e: Event) => e.preventDefault());
    document.addEventListener('k-test', listener, { once: true });
    const result = emit(el, 'k-test', { a: 1 }, { cancelable: true });
    expect(result).toBe(false);
    const event = listener.mock.calls[0]![0] as CustomEvent;
    expect(event.detail).toEqual({ a: 1 });
    expect(event.composed).toBe(true);
  });
});

describe('focus utilities', () => {
  it('collects tabbables across shadow roots and slots in composed order', () => {
    const host = mount<HTMLDivElement>(`
      <div>
        <button id="a">a</button>
        <div id="host"><input id="slotted"></div>
        <button id="b" disabled>b</button>
        <span tabindex="-1">skip</span>
        <a href="#" id="c">c</a>
      </div>`);
    const shadowHost = host.querySelector('#host')!;
    const root = shadowHost.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<button id="inner-1">1</button><slot></slot><button id="inner-2" hidden>2</button>';

    const ids = getTabbableElements(host).map((el) => el.id);
    expect(ids).toEqual(['a', 'inner-1', 'slotted', 'c']);

    (root.querySelector('#inner-1') as HTMLButtonElement).focus();
    expect(getActiveElement()?.id).toBe('inner-1');
  });
});

describe('update scheduling', () => {
  it('keeps requestUpdate() calls made during update() and updated()', async () => {
    const name = tag('follow-up');
    class FollowUp extends KernoElement {
      external = 0;
      rendered = -1;
      cycles = 0;

      protected override update(): void {
        this.cycles++;
        this.rendered = this.external;
        // Non-reactive data changed while rendering: ask for another pass.
        if (this.external === 1) {
          this.external = 2;
          this.requestUpdate();
        }
      }

      protected override updated(): void {
        if (this.external === 2 && this.rendered === 2) {
          this.external = 3;
          this.requestUpdate();
        }
      }
    }
    define(name, FollowUp);

    const el = mount<FollowUp>(`<${name}></${name}>`);
    await el.updateComplete;
    const initialCycles = el.cycles;

    el.external = 1;
    el.requestUpdate();
    await el.updateComplete;

    // Previously the cycle requested from update() was dropped and `rendered` stayed 1.
    expect(el.rendered).toBe(3);
    expect(el.cycles).toBe(initialCycles + 3);
  });
});

describe('initial render', () => {
  it('stamps the template even when the shadow root already holds nodes', async () => {
    const name = tag('prefilled');
    class Prefilled extends KernoElement {
      static override template = '<span class="stamped"></span>';

      constructor() {
        super();
        // What the `<style>` fallback does where constructable stylesheets are unsupported.
        this.renderRoot.append(document.createElement('style'));
      }
    }
    define(name, Prefilled);

    const el = mount<Prefilled>(`<${name}></${name}>`);
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.stamped')).not.toBeNull();
  });

  it('reuses a declarative shadow root instead of stamping the template', async () => {
    const name = tag('hydrated');
    class Hydrated extends KernoElement {
      static override template = '<span class="stamped"></span>';
    }
    define(name, Hydrated);

    document.body.setHTMLUnsafe(`
      <${name}><template shadowrootmode="open"><span class="ssr"></span></template></${name}>
    `);
    const el = document.body.querySelector(name) as Hydrated;
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.ssr')).not.toBeNull();
    expect(el.renderRoot.querySelector('.stamped')).toBeNull();
  });
});
