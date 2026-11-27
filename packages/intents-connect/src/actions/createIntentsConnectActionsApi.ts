import type {
  ActionCatalogEntry,
  ActionResolution,
  IntentsConnectActionsApi,
  IntentsConnectActionsApiOptions,
} from '@/actions/types';
import { IntentsConnectActionsApiError } from '@/errors';
import { createJsonRequest, errorFieldMessage, unwrapResult } from '@/http';

const DEFAULT_TIMEOUT = 15_000;

const LABEL = 'Intents Connect actions API';

/** Errors are `{ "error": "…" }`, as on the execution API. */
const errorMessage = errorFieldMessage(LABEL);

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
    label: LABEL,
    toHttpError: ({ payload, raw, status, parsed }) =>
      new IntentsConnectActionsApiError(
        errorMessage(payload, status, raw),
        status,
        parsed ? payload : raw,
      ),
    unwrap: unwrapResult,
  });

  return {
    listActions: () => send<ActionCatalogEntry[]>({ path: 'api/v1/actions' }),
    // An unpinned request's `expectedSha256Hash: undefined` is left out of
    // the JSON body.
    resolveAction: (actionId, request) =>
      send<ActionResolution>({
        path: `api/v1/actions/${encodeURIComponent(actionId)}/resolve`,
        method: 'POST',
        body: request,
      }),
  };
};
