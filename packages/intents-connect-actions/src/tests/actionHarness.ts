import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020, { type ErrorObject } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

/**
 * Runs an action the way the actions repo's Go catalog does, as far as the
 * TypeScript twin can: the definition's `inputSchema` is compiled as JSON
 * Schema 2020-12 with formats asserted, defaults on direct properties fill
 * omitted keys, and errors read like the Go ones (`at '/amount': …` for the
 * schema, `invalid action input: …` for the script).
 */

export const ACTIONS_DIR = fileURLToPath(
  new URL('../../actions/', import.meta.url),
);

export type ActionDefinition = {
  id: string;
  version: number;
  templateFormat: string;
  supportedChains: string[];
  inputSchema: {
    type: 'object';
    additionalProperties: false;
    required: string[];
    properties: Record<string, Record<string, unknown>>;
  };
};

export type ActionFixture = {
  input: Record<string, unknown>;
  assetChains?: Record<string, string>;
  expected?: { executionChain: string; execution: Record<string, unknown> };
  errorContains?: string;
};

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, 'utf8'));

export const readActionFile = (action: string, file: string): string =>
  readFileSync(join(ACTIONS_DIR, action, file), 'utf8');

export const loadDefinition = (action: string): ActionDefinition =>
  readJson(join(ACTIONS_DIR, action, 'definition.json')) as ActionDefinition;

export const loadFixtures = (
  action: string,
): { name: string; fixture: ActionFixture }[] => {
  const dir = join(ACTIONS_DIR, action, 'tests');

  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({
      name,
      fixture: readJson(join(dir, name)) as ActionFixture,
    }));
};

const describeError = (error: ErrorObject): string => {
  const extra =
    error.keyword === 'additionalProperties'
      ? ` '${String(error.params.additionalProperty)}'`
      : '';

  return `at '${error.instancePath}': ${error.message ?? error.keyword}${extra}`;
};

export type InputValidation<T> =
  | { ok: true; inputs: T }
  | { ok: false; message: string };

/**
 * A validator for the definition's inputs. It never mutates its argument:
 * defaults are applied to a copy.
 */
export const compileInputs = <T>(definition: ActionDefinition) => {
  const ajv = new Ajv2020({ strict: true, allErrors: true, useDefaults: true });

  addFormats(ajv);
  const validate = ajv.compile<T>(definition.inputSchema);

  return (input: unknown): InputValidation<T> => {
    const copy: unknown = structuredClone(input);

    if (validate(copy)) {
      return { ok: true, inputs: copy };
    }

    return {
      ok: false,
      message: `invalid action input: ${(validate.errors ?? []).map(describeError).join('; ')}`,
    };
  };
};
