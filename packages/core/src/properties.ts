// Standard (TC39) decorators store per-class data on `Symbol.metadata`. Not all
// runtimes ship it yet; this shim matches the key esbuild/TypeScript fall back to.
(Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata');

export type PropertyType =
  StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor | ArrayConstructor;

export interface AttributeConverter<T = unknown> {
  fromAttribute?(value: string | null, type?: PropertyType): T;
  toAttribute?(value: T, type?: PropertyType): string | null;
}

export interface PropertyOptions<T = unknown> {
  /** Drives attribute ⇄ property conversion. Defaults to `String`. */
  type?: PropertyType;
  /**
   * Observed attribute name. Defaults to the kebab-cased property name;
   * `false` disables attribute observation.
   */
  attribute?: string | false;
  /** Write the property back to the attribute after each update. */
  reflect?: boolean;
  converter?: AttributeConverter<T>;
  /** Defaults to `!Object.is(value, old)`. */
  hasChanged?(value: T, old: T): boolean;
}

export interface PropertyDeclaration extends PropertyOptions {
  name: string;
  /** Resolved attribute name, or `null` when not observed. */
  attributeName: string | null;
  /** Internal reactive state (never an attribute, not public API). */
  state: boolean;
}

const PROPS = Symbol('kerno.props');

type Metadata = DecoratorMetadataObject & { [PROPS]?: Map<string, PropertyDeclaration> };

export const kebabCase = (name: string): string =>
  name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Registers a declaration on the class metadata, inheriting the parent's map. */
export function declareProperty(
  metadata: DecoratorMetadataObject,
  name: string,
  options: PropertyOptions,
  state = false,
): PropertyDeclaration {
  const meta = metadata as Metadata;
  if (!Object.hasOwn(meta, PROPS)) meta[PROPS] = new Map(meta[PROPS]);
  const declaration: PropertyDeclaration = {
    ...options,
    name,
    state,
    attributeName:
      state || options.attribute === false
        ? null
        : typeof options.attribute === 'string'
          ? options.attribute
          : kebabCase(name),
  };
  meta[PROPS]!.set(name, declaration);
  return declaration;
}

/** Declarations for a class, including inherited ones. */
export function getPropertyDeclarations(ctor: object): ReadonlyMap<string, PropertyDeclaration> {
  const meta = (ctor as { [Symbol.metadata]?: Metadata | null })[Symbol.metadata];
  return meta?.[PROPS] ?? new Map();
}

export const defaultConverter: Required<AttributeConverter> = {
  fromAttribute(value, type) {
    switch (type) {
      case Boolean:
        return value !== null;
      case Number:
        return value === null ? null : Number(value);
      case Object:
      case Array:
        if (value === null) return null;
        try {
          return JSON.parse(value) as unknown;
        } catch {
          return null;
        }
      default:
        return value;
    }
  },
  toAttribute(value, type) {
    switch (type) {
      case Boolean:
        return value ? '' : null;
      case Object:
      case Array:
        return value == null ? null : JSON.stringify(value);
      default:
        return value == null ? null : String(value);
    }
  },
};

export const notEqual = (value: unknown, old: unknown): boolean => !Object.is(value, old);
