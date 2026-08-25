/** 30 TGas. */
export const FT_DEPOSIT_GAS = `30${'0'.repeat(12)}`;
/** 50 TGas. */
export const FT_TRANSFER_GAS = `50${'0'.repeat(12)}`;

// FastNear first: rpc.mainnet.near.org is deprecated and heavily rate-limited,
// so it is kept only as the failover reserve (matching the widget's client).
export const DEFAULT_RPC_URLS = [
  'https://free.rpc.fastnear.com',
  'https://rpc.mainnet.near.org',
];
