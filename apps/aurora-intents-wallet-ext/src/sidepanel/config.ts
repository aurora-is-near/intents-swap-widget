// Aurora fee service app key (same alpha key as apps/intents-chrome-ext). It
// ships in the bundle; persistent deposit addresses also need the key's
// organisation to be approved for them.
export const API_KEY = '5a6c4f98-f174-4bd2-aa19-3d53e3abe87d';

// Wallet balances (EVM, Solana). Same key as apps/intents-chrome-ext.
export const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';

/**
 * Fee service for persistent deposit addresses. Overridable to point at a
 * local instance (`VITE_FEE_SERVICE_URL=http://localhost:3005`); the widget
 * itself always uses the production fee service.
 */
export const FEE_SERVICE_URL =
  (import.meta.env.VITE_FEE_SERVICE_URL as string | undefined) ??
  'https://intents-api.aurora.dev';

export const PDA_API_KEY =
  (import.meta.env.VITE_PDA_API_KEY as string | undefined) ?? API_KEY;

/** Every deposit is converted to this asset inside the account. */
export const DEPOSIT_ASSET = { chain: 'base', symbol: 'USDC' } as const;
