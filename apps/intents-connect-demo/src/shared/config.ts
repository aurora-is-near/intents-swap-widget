/**
 * Metadata for the asset an integration is paid out in.
 *
 * The service's `networkFee` is denominated in the DESTINATION asset — it is
 * the gas reimbursement for running the steps on the destination chain,
 * appended to every execution as a final transfer whose value equals the fee —
 * so it must be formatted with THESE decimals, never the origin token's. Base
 * pays in 18-decimal ETH and Polygon in 6-decimal USDC, which is why this is
 * per-integration rather than one module-level constant.
 */
export type DestinationToken = { symbol: string; decimals: number };

export const API_URL = 'https://intents-connect-alpha-api.aurora.dev';
export const API_KEY = '5a6c4f98-f174-4bd2-aa19-3d53e3abe87d';
export const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';
