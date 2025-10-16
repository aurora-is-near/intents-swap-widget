/**
 * Virtual Chain Support Types
 *
 * Virtual chains are Layer 2 solutions that run on top of NEAR Protocol.
 * Examples: Aurora (EVM), potentially others in the future.
 */

export interface VirtualChainConfig {
  /** Virtual chain identifier used in 1Click API recipient field */
  chainId: string;

  /** Display name */
  name: string;

  /** Whether this chain uses EVM addresses */
  isEvm: boolean;

  /** Exit precompile address (for withdrawals from virtual chain) */
  exitPrecompile?: string;

  /**
   * Maps virtual chain token addresses to their NEAR-bridged equivalents.
   * Required because 1Click API only accepts NEAR-based tokens as destinations.
   *
   * Key: Token address on virtual chain (lowercase)
   * Value: NEAR nep141 AssetId
   */
  tokenBridgeMap: Record<string, string>;
}

export interface VirtualChainQuoteParams {
  /** EVM recipient address on the virtual chain */
  virtualChainRecipient: string;

  /** EVM refund recipient address on the virtual chain */
  virtualChainRefundRecipient: string;
}
