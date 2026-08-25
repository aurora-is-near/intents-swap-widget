export const DEST_ASSET = 'nep141:base.omft.near';

/**
 * What DEST_ASSET actually is: native ETH on Base.
 *
 * The service's `networkFee` is denominated in the DESTINATION asset — it is
 * the gas reimbursement for running the steps on Base, appended to every
 * execution as a final `native` transfer whose value equals the fee — so it
 * must be formatted with THESE decimals, never the origin token's.
 */
export const DEST_TOKEN = { symbol: 'ETH', decimals: 18 };
export const API_URL = 'https://intents-connect-alpha-api.aurora.dev';
export const API_KEY = '5a6c4f98-f174-4bd2-aa19-3d53e3abe87d';
export const BASE_RPC = 'https://base-rpc.publicnode.com';
export const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';
