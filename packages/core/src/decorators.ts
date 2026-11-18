import type { KernoElement } from './element.js';
import { declareProperty, notEqual, type PropertyOptions } from './properties.js';

type Accessor<C, V> = (
  target: ClassAccessorDecoratorTarget<C, V>,
  context: ClassAccessorDecoratorContext<C, V>,
) => ClassAccessorDecoratorResult<C, V>;

function reactive<C extends KernoElement, V>(
  options: PropertyOptions<V>,
  state: boolean,
): Accessor<C, V> {
  return (target, context) => {
    const { name } = context;
    if (context.static || typeof name !== 'string') {
      throw new TypeError(
        '[kerno] @prop/@state only support instance accessors with string names.',
      );
    }
    declareProperty(context.metadata, name, options as PropertyOptions, state);
    const hasChanged = options.hasChanged ?? notEqual;

    return {
      set(this: C, value: V) {
        const old = target.get.call(this);
        if (!hasChanged(value, old)) return;
        target.set.call(this, value);
        this.requestUpdate(name, old);
      },
      init(this: C, value: V) {
        this.requestUpdate(name, undefined);
        return value;
      },
    };
  };
}

/**
 * Public reactive property, optionally observed from / reflected to an attribute.
 *
 * @example
 * @prop({ type: Boolean, reflect: true }) accessor disabled = false;
 */
export function prop<C extends KernoElement, V>(options: PropertyOptions<V> = {}): Accessor<C, V> {
  return reactive(options, false);
}

/** Internal reactive state. Never an attribute; not part of the public API. */
export function state<C extends KernoElement, V>(
  options: Pick<PropertyOptions<V>, 'hasChanged'> = {},
): Accessor<C, V> {
  return reactive(options, true);
}
