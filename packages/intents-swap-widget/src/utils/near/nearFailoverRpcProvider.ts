import { JsonRpcProvider } from 'near-api-js/lib/providers';

const RETRYABLE_HTTP_STATUS_CODES = new Set([
  408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524,
]);

const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENETDOWN',
  'ENETUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const RETRYABLE_NETWORK_ERROR_PATTERN =
  /failed to fetch|fetch failed|load failed|network(?: request)? (?:error|failed)|socket hang up|connection (?:reset|refused)|timed? ?out/i;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isRetryableNearRpcError = (error: unknown): boolean => {
  if (!isObject(error)) {
    return false;
  }

  const status = error.status ?? error.statusCode;

  if (typeof status === 'number' && RETRYABLE_HTTP_STATUS_CODES.has(status)) {
    return true;
  }

  if (
    typeof error.cause === 'number' &&
    RETRYABLE_HTTP_STATUS_CODES.has(error.cause)
  ) {
    return true;
  }

  if (
    typeof error.code === 'string' &&
    RETRYABLE_NETWORK_ERROR_CODES.has(error.code)
  ) {
    return true;
  }

  if (
    typeof error.message === 'string' &&
    RETRYABLE_NETWORK_ERROR_PATTERN.test(error.message)
  ) {
    return true;
  }

  return error.cause !== error && isRetryableNearRpcError(error.cause);
};

class ProxyFirstNearRpcProvider extends JsonRpcProvider {
  readonly rpcProviders: JsonRpcProvider[];

  constructor(rpcProviders: JsonRpcProvider[]) {
    const primaryProvider = rpcProviders[0];

    if (!primaryProvider) {
      throw new Error('At least one NEAR RPC provider must be specified');
    }

    super(primaryProvider.connection, primaryProvider.options);
    this.rpcProviders = rpcProviders;
  }

  private async sendWithFallback<T>(
    providerIndex: number,
    method: string,
    params: object,
  ): Promise<T> {
    const rpcProvider = this.rpcProviders[providerIndex];

    if (!rpcProvider) {
      throw new Error('NEAR RPC provider index is out of range');
    }

    try {
      return await rpcProvider.sendJsonRpc<T>(method, params);
    } catch (error: unknown) {
      const hasFallback = providerIndex + 1 < this.rpcProviders.length;

      if (!hasFallback || !isRetryableNearRpcError(error)) {
        throw error;
      }

      return this.sendWithFallback(providerIndex + 1, method, params);
    }
  }

  override async sendJsonRpc<T>(method: string, params: object): Promise<T> {
    // Always begin with the proxy/primary provider for each request. A fallback
    // is tried only for explicitly retryable transport or HTTP status errors.
    return this.sendWithFallback(0, method, params);
  }
}

export const createNearFailoverRpcProvider = (
  rpcProviders: JsonRpcProvider[],
): JsonRpcProvider => new ProxyFirstNearRpcProvider(rpcProviders);

export const nearFailoverRpcProvider = ({
  urls,
}: {
  urls: string[];
}): JsonRpcProvider => {
  const rpcProviders = urls.map(
    (url) => new JsonRpcProvider({ url }, { retries: 1 }),
  );

  return createNearFailoverRpcProvider(rpcProviders);
};
