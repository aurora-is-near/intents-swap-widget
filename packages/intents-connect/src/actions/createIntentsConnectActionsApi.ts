import type {
  ActionCatalogEntry,
  ActionResolution,
  IntentsConnectActionsApi,
  IntentsConnectActionsApiOptions,
} from '@/actions/types';
import { IntentsConnectActionsApiError } from '@/errors';
import { bodySnippet, createJsonRequest } from '@/http';

const DEFAULT_TIMEOUT = 15_000;

/** Responses are wrapped as `{ result: … }`; tolerate a bare body too. */
const unwrap = (payload: unknown): unknown =>
  payload && typeof payload === 'object' && 'result' in payload
    ? (payload as { result: unknown }).result
    : payload;

/** Errors are `{ "error": "…" }`, as on the execution API. */
const errorMessage = (
  payload: unknown,
  status: number,
  raw: string,
): string => {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const { error } = payload as { error: unknown };

    if (typeof error === 'string' && error) {
      return error;
    }
  }

  const snippet = bodySnippet(raw);

  return snippet
    ? `Intents Connect actions API responded ${status}: ${snippet}`
    : `Intents Connect actions API responded ${status}`;
};

/**
 * Client for the Intents Connect actions API: the catalog of hosted actions
 * and their resolution into execution creation bodies. Both endpoints are
 * public, so no API key is sent. Execution creation stays on the execution
 * API (`createIntentsConnectApi`); `actionRecipe` connects the two.
 */
export const createIntentsConnectActionsApi = (
  options: IntentsConnectActionsApiOptions,
): IntentsConnectActionsApi => {
  const { baseUrl, fetch: fetchImpl, timeout = DEFAULT_TIMEOUT } = options;

  const send = createJsonRequest({
    baseUrl,
    fetch: fetchImpl,
    timeout,
    label: 'Intents Connect actions API',
    toHttpError: ({ payload, raw, status, parsed }) =>
      new IntentsConnectActionsApiError(
        errorMessage(payload, status, raw),
        status,
        parsed ? payload : raw,
      ),
    unwrap,
  });

  return {
    listActions: () => send<ActionCatalogEntry[]>({ path: 'api/v1/actions' }),
    resolveAction: (actionId, { version, expectedSha256Hash, inputs }) =>
      send<ActionResolution>({
        path: `api/v1/actions/${encodeURIComponent(actionId)}/resolve`,
        method: 'POST',
        body: {
          version,
          ...(expectedSha256Hash === undefined ? {} : { expectedSha256Hash }),
          inputs,
        },
      }),
  };
};
