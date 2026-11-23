import { afterEach, describe, expect, it } from 'vitest';
import { AriaForwardingController, FormAssociatedElement, define } from './index.js';

type Reflecting = Element & { ariaLabelledByElements?: readonly Element[] | null };

const supportsReflection = 'ariaLabelledByElements' in Element.prototype;
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

class LabelledField extends FormAssociatedElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template =
    '<input class="inner" /><span id="label" class="label"><slot></slot></span>';

  fallback: string | null = null;

  constructor() {
    super();
    new AriaForwardingController(this, {
      getTarget: () => this.inner,
      getInternalLabelId: () => (this.textContent?.trim() ? 'label' : null),
      getFallbackLabel: () => this.fallback,
    });
  }

  get inner(): (HTMLInputElement & Reflecting) | null {
    return this.renderRoot.querySelector<HTMLInputElement>('.inner');
  }
}
define('test-labelled-field', LabelledField);

const fields = async (html: string): Promise<LabelledField[]> => {
  document.body.innerHTML = html;
  const all = [...document.querySelectorAll<LabelledField>('test-labelled-field')];
  await Promise.all(all.map((el) => el.updateComplete));
  return all;
};

/** Asserts `el` is labelled by `ref`, via element reflection or the copied-text fallback. */
const expectLabelledBy = (el: Reflecting, ref: Element): void => {
  if (supportsReflection) {
    expect(el.ariaLabelledByElements).toHaveLength(1);
    expect(el.ariaLabelledByElements?.[0]).toBe(ref);
  } else {
    expect(el.getAttribute('aria-label')).toBe(ref.textContent?.trim());
  }
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AriaForwardingController', () => {
  it('forwards the host aria-label and follows later changes', async () => {
    const [el] = await fields('<test-labelled-field aria-label="Email"></test-labelled-field>');
    expect(el!.inner!.getAttribute('aria-label')).toBe('Email');

    el!.setAttribute('aria-label', 'Work email');
    await tick();
    expect(el!.inner!.getAttribute('aria-label')).toBe('Work email');

    el!.removeAttribute('aria-label');
    await tick();
    expect(el!.inner!.hasAttribute('aria-label')).toBe(false);
  });

  it('names the inner element by the visible slotted label', async () => {
    const [el] = await fields('<test-labelled-field>Accept terms</test-labelled-field>');
    expect(el!.inner!.getAttribute('aria-labelledby')).toBe('label');
    expect(el!.inner!.hasAttribute('aria-label')).toBe(false);
  });

  it('resolves aria-labelledby and <label for> across the shadow boundary', async () => {
    const [byId, byLabel] = await fields(`
      <span id="ext">Shipping address</span>
      <label for="billing">Billing address</label>
      <test-labelled-field aria-labelledby="ext"></test-labelled-field>
      <test-labelled-field id="billing"></test-labelled-field>
    `);
    expectLabelledBy(byId!.inner!, document.getElementById('ext')!);
    expectLabelledBy(byLabel!.inner!, document.querySelector('label')!);
  });

  it('prefers the host aria-label over the slotted label and uses the fallback last', async () => {
    const [named, bare] = await fields(`
      <test-labelled-field aria-label="Override">Visible</test-labelled-field>
      <test-labelled-field></test-labelled-field>
    `);
    expect(named!.inner!.getAttribute('aria-label')).toBe('Override');
    expect(named!.inner!.hasAttribute('aria-labelledby')).toBe(false);

    expect(bare!.inner!.hasAttribute('aria-label')).toBe(false);
    bare!.fallback = 'Rating';
    bare!.requestUpdate();
    await bare!.updateComplete;
    expect(bare!.inner!.getAttribute('aria-label')).toBe('Rating');
  });

  it('replaces an internal aria-labelledby when switching to an external aria-labelledby and back', async () => {
    const [el] = await fields(
      '<span id="ext">External</span><test-labelled-field>Slotted</test-labelled-field>',
    );
    expect(el!.inner!.getAttribute('aria-labelledby')).toBe('label');

    el!.setAttribute('aria-labelledby', 'ext');
    await tick();
    expect(el!.inner!.getAttribute('aria-labelledby')).not.toBe('label');
    expectLabelledBy(el!.inner!, document.getElementById('ext')!);

    el!.removeAttribute('aria-labelledby');
    await tick();
    expect(el!.inner!.getAttribute('aria-labelledby')).toBe('label');
  });

  it('forwards aria-description', async () => {
    const [el] = await fields(
      '<test-labelled-field aria-description="We never share it"></test-labelled-field>',
    );
    expect(el!.inner!.getAttribute('aria-description')).toBe('We never share it');
  });
});
