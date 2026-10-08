// Aurora fee service app key (same alpha key as apps/intents-chrome-ext). It
// ships in the bundle; persistent deposit addresses also need the key's
// organisation to be approved for them.
const API_KEY = '5a6c4f98-f174-4bd2-aa19-3d53e3abe87d';

// Wallet balances (EVM, Solana). Same key as apps/intents-chrome-ext.
export const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';

const FEE_SERVICE_OVERRIDE = import.meta.env.VITE_FEE_SERVICE_URL as
  | string
  | undefined;

/**
 * Fee service for everything: deposit addresses here, quotes and intents in
 * the widget. Overridable to point at a local instance
 * (`VITE_FEE_SERVICE_URL=http://localhost:3005`).
 */
export const FEE_SERVICE_URL =
  FEE_SERVICE_OVERRIDE ?? 'https://intents-api.aurora.dev';

/** The widget's `intentsApiUrl`: only set to override production. */
export const WIDGET_INTENTS_API_URL = FEE_SERVICE_OVERRIDE;

/** An app key known to that fee service (a local one has its own keys). */
export const FEE_SERVICE_API_KEY =
  (import.meta.env.VITE_PDA_API_KEY as string | undefined) ?? API_KEY;

/**
 * Every deposit is converted to this asset, as its intents representation
 * (USDC on NEAR, the same mapping the swap widget uses for deposits).
 */
export const DEPOSIT_SYMBOL = 'USDC';
