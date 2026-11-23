/**
 * Env helpers shared by the client (`src/config.ts`) and the API-key proxy
 * (`server/intentsConnectProxy.ts`). No imports: the Edge Function bundles
 * this file.
 */

/** A trimmed env value, or `undefined` when unset or empty. */
export const readEnv = (value: string | undefined) => {
  const trimmed = value?.trim();

  return trimmed === '' ? undefined : trimmed;
};
