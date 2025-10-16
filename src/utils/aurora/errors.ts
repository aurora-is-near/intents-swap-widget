import { BaseError } from '@/errors';

export type AuroraErrorCode =
  | 'AURORA_TOKEN_NOT_FOUND'
  | 'AURORA_EXIT_FAILED'
  | 'AURORA_INVALID_ASSET_ID'
  | 'AURORA_UNSUPPORTED_TOKEN'
  | 'AURORA_PROVIDER_NOT_AVAILABLE'
  | 'AURORA_NO_NEAR_EQUIVALENT';

export interface AuroraErrorMeta {
  tokenAddress?: string;
  assetId?: string;
  message?: string;
  txHash?: string;
}

export class AuroraError extends BaseError<AuroraErrorCode, AuroraErrorMeta> {
  constructor(data: { code: AuroraErrorCode; meta?: AuroraErrorMeta }) {
    super(data);
    this.name = 'AuroraError';
  }
}

// Helper functions for common Aurora errors
export const auroraErrors = {
  tokenNotFound: (tokenAddress: string) =>
    new AuroraError({
      code: 'AURORA_TOKEN_NOT_FOUND',
      meta: {
        tokenAddress,
        message: `Token ${tokenAddress} not found on Aurora`,
      },
    }),

  exitFailed: (message: string, txHash?: string) =>
    new AuroraError({
      code: 'AURORA_EXIT_FAILED',
      meta: { message, txHash },
    }),

  invalidAssetId: (assetId: string) =>
    new AuroraError({
      code: 'AURORA_INVALID_ASSET_ID',
      meta: { assetId, message: `Invalid Aurora asset ID format: ${assetId}` },
    }),

  unsupportedToken: (tokenAddress: string) =>
    new AuroraError({
      code: 'AURORA_UNSUPPORTED_TOKEN',
      meta: {
        tokenAddress,
        message: `Token ${tokenAddress} is not supported for Aurora operations`,
      },
    }),

  providerNotAvailable: () =>
    new AuroraError({
      code: 'AURORA_PROVIDER_NOT_AVAILABLE',
      meta: { message: 'Aurora provider is not available' },
    }),

  noNearEquivalent: (tokenAddress: string, symbol: string) =>
    new AuroraError({
      code: 'AURORA_NO_NEAR_EQUIVALENT',
      meta: {
        tokenAddress,
        message: `Token ${symbol} does not have a NEAR-bridged equivalent. Cannot use as destination for external chain transfers.`,
      },
    }),
};
