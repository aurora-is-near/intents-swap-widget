/* eslint-disable no-console */
/**
 * Regenerates `src/api/generated/openapi.ts` from the live Intents Connect
 * OpenAPI document.
 *
 * The generated file is COMMITTED. It is not the package's public API — every
 * schema in the document is optional (none declare `required`), so exposing it
 * directly would erase the invariants the runner and guards rely on. It exists
 * so `src/api/generated/conformance.ts` can assert our hand-written types still
 * match the wire contract: regenerate, run `yarn typecheck`, and a breaking API
 * change shows up as a type error naming exactly what drifted.
 *
 * Usage:
 *   yarn generate:api
 *   INTENTS_CONNECT_OPENAPI_URL=<url> yarn generate:api
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import openapiTS, { astToString } from 'openapi-typescript';

const DEFAULT_URL =
  'https://intents-connect-alpha-api.aurora.dev/swagger/openapi.json';

const url = process.env.INTENTS_CONNECT_OPENAPI_URL ?? DEFAULT_URL;
const outFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/api/generated/openapi.ts',
);

const BANNER = `/* eslint-disable */
/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Run \`yarn generate:api\` to refresh from the OpenAPI document:
 *   ${url}
 *
 * Not part of this package's public API. See ./conformance.ts for how these
 * types are used to detect wire-contract drift.
 */
`;

console.log(`generate:api: fetching ${url}`);

const ast = await openapiTS(new URL(url));

writeFileSync(outFile, `${BANNER}\n${astToString(ast)}`);

console.log(`generate:api: wrote ${outFile}`);
