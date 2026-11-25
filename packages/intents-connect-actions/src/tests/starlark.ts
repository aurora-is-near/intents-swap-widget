import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { Starlark } from 'starlark-wasm';

/**
 * Runs Starlark in the tests through `starlark-wasm`: starlark-go compiled to
 * WebAssembly, the interpreter the actions repo embeds (in an older release).
 * The package is written for browsers, so this loads its WebAssembly from
 * disk and gives it the `window` global it registers itself on.
 */

/** What `run` takes as an argument (the package does not export the type). */
type StarlarkCompatibleValue = NonNullable<
  Parameters<Starlark['run']>[2]
>[number];

let ready: Promise<void> | undefined;

const init = async (): Promise<void> => {
  const wasm = readFileSync(
    createRequire(import.meta.url).resolve('starlark-wasm/wasm'),
  );

  const { fetch } = globalThis;

  // `Starlark.init` fetches its WebAssembly by URL and sets
  // `window.starlark`; in node `window` is `globalThis`.
  Object.assign(globalThis, { window: globalThis });
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(wasm, { headers: { 'content-type': 'application/wasm' } }),
    );

  try {
    await Starlark.init('starlark.wasm');
  } finally {
    globalThis.fetch = fetch;
  }
};

/**
 * A JSON value as the runtime takes it. Absent object keys stay absent, as
 * in the catalog, which hands the script the validated JSON object.
 */
const toStarlark = (value: unknown): StarlarkCompatibleValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toStarlark);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, toStarlark(entry)]),
    );
  }

  throw new Error(`Not a JSON value: ${typeof value}`);
};

export type StarlarkScript = (
  fn: string,
  ...args: unknown[]
) => Promise<unknown>;

/**
 * Loads `source` as one module and returns a caller of its functions.
 * Module loading (`load(...)`) is rejected, as in the actions catalog.
 */
export const loadStarlarkScript = async (
  source: string,
): Promise<StarlarkScript> => {
  ready ??= init();
  await ready;

  const starlark = new Starlark({
    load: (filename) =>
      filename === 'script.star'
        ? Promise.resolve(source)
        : Promise.reject(new Error(`load(${filename}) is not allowed`)),
    print: () => undefined,
  });

  return (fn, ...args) =>
    starlark.run('script.star', fn, args.map(toStarlark), {}, 1);
};
