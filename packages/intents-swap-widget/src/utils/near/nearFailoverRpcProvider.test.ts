import { JsonRpcProvider } from 'near-api-js/lib/providers';

import {
  createNearFailoverRpcProvider,
  isRetryableNearRpcError,
} from './nearFailoverRpcProvider';

const createProvider = (url: string) =>
  new JsonRpcProvider({ url }, { retries: 1 });

describe('createNearFailoverRpcProvider', () => {
  it('starts every request from the primary provider', async () => {
    const primary = createProvider('https://proxy.example.com');
    const fallback = createProvider('https://fallback.example.com');
    const retryableError = Object.assign(new Error('Rate limited'), {
      cause: 429,
    });

    const primaryRequest = jest
      .spyOn(primary, 'sendJsonRpc')
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce('primary result');

    const fallbackRequest = jest
      .spyOn(fallback, 'sendJsonRpc')
      .mockResolvedValue('fallback result');

    const provider = createNearFailoverRpcProvider([primary, fallback]);

    await expect(provider.sendJsonRpc('query', {})).resolves.toBe(
      'fallback result',
    );
    await expect(provider.sendJsonRpc('query', {})).resolves.toBe(
      'primary result',
    );

    expect(primaryRequest).toHaveBeenCalledTimes(2);
    expect(fallbackRequest).toHaveBeenCalledTimes(1);
  });

  it('does not fail over for JSON-RPC application errors', async () => {
    const primary = createProvider('https://proxy.example.com');
    const fallback = createProvider('https://fallback.example.com');
    const applicationError = Object.assign(new Error('Unknown account'), {
      type: 'UNKNOWN_ACCOUNT',
    });

    jest.spyOn(primary, 'sendJsonRpc').mockRejectedValue(applicationError);
    const fallbackRequest = jest.spyOn(fallback, 'sendJsonRpc');
    const provider = createNearFailoverRpcProvider([primary, fallback]);

    await expect(provider.sendJsonRpc('query', {})).rejects.toBe(
      applicationError,
    );
    expect(fallbackRequest).not.toHaveBeenCalled();
  });

  it('returns the last retryable error when every provider fails', async () => {
    const primary = createProvider('https://proxy.example.com');
    const fallback = createProvider('https://fallback.example.com');
    const primaryError = Object.assign(new Error('Service unavailable'), {
      cause: 503,
    });

    const fallbackError = new TypeError('Failed to fetch');

    jest.spyOn(primary, 'sendJsonRpc').mockRejectedValue(primaryError);
    jest.spyOn(fallback, 'sendJsonRpc').mockRejectedValue(fallbackError);

    const provider = createNearFailoverRpcProvider([primary, fallback]);

    await expect(provider.sendJsonRpc('query', {})).rejects.toBe(fallbackError);
  });
});

describe('isRetryableNearRpcError', () => {
  it.each([
    [{ cause: 408 }, true],
    [{ status: 429 }, true],
    [{ statusCode: 503 }, true],
    [{ code: 'ECONNRESET' }, true],
    [new TypeError('Failed to fetch'), true],
    [{ cause: { code: 'ETIMEDOUT' } }, true],
    [{ cause: 400 }, false],
    [
      Object.assign(new Error('Unknown account'), { type: 'UNKNOWN_ACCOUNT' }),
      false,
    ],
  ])('classifies %p as retryable: %p', (error, expected) => {
    expect(isRetryableNearRpcError(error)).toBe(expected);
  });
});
