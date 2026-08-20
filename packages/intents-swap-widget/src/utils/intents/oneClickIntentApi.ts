import { feeServiceApi } from '@/network';
import { WidgetError } from '@/errors';
import type {
  GenerateIntentRequest,
  GenerateIntentResponse,
  IntentSigningStandard,
  PreparedIntent,
  SubmitIntentRequest,
  SubmitIntentResponse,
} from '@/types/intents';

const isNep413Payload = (
  value: unknown,
): value is Extract<PreparedIntent, { standard: 'nep413' }>['payload'] => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.message === 'string' &&
    typeof payload.nonce === 'string' &&
    typeof payload.recipient === 'string' &&
    (payload.callbackUrl == null || typeof payload.callbackUrl === 'string')
  );
};

export function assertPreparedIntent(
  intent: unknown,
  expectedStandard: IntentSigningStandard,
): asserts intent is PreparedIntent {
  if (!intent || typeof intent !== 'object' || !('standard' in intent)) {
    throw new WidgetError('1Click returned no intent payload for signing');
  }

  const preparedIntent = intent as PreparedIntent;

  if (preparedIntent.standard !== expectedStandard) {
    throw new WidgetError(
      `1Click returned ${preparedIntent.standard} payload for ${expectedStandard} signer`,
    );
  }

  const hasValidPayload =
    preparedIntent.standard === 'nep413'
      ? isNep413Payload(preparedIntent.payload)
      : typeof preparedIntent.payload === 'string';

  if (!hasValidPayload) {
    throw new WidgetError(
      `1Click returned an invalid ${preparedIntent.standard} signing payload`,
    );
  }
}

export const requestIntentForSigning = async ({
  apiKey,
  request,
}: {
  apiKey?: string;
  request: GenerateIntentRequest;
}): Promise<GenerateIntentResponse> => {
  if (!apiKey) {
    throw new WidgetError('API key is required to generate an intent');
  }

  const { data } = await feeServiceApi.post<GenerateIntentResponse>(
    `/api/generate-intent/${apiKey}`,
    request,
  );

  return data;
};

export const submitSignedIntent = async ({
  apiKey,
  request,
}: {
  apiKey?: string;
  request: SubmitIntentRequest;
}): Promise<SubmitIntentResponse> => {
  if (!apiKey) {
    throw new WidgetError('API key is required to submit an intent');
  }

  const { data } = await feeServiceApi.post<SubmitIntentResponse>(
    `/api/submit-intent/${apiKey}`,
    request,
  );

  return data;
};
