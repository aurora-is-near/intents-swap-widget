/**
 * Chain-family routing. Mirrors `packages/intents-swap-widget/src/utils/chains`
 * but carries only what deposit routing needs — no chain SDKs.
 */
export const EVM_CHAINS = new Set([
  'eth',
  'arb',
  'base',
  'bsc',
  'op',
  'pol',
  'avax',
  'scroll',
  'gnosis',
  'xlayer',
  'bera',
  'monad',
  'plasma',
  'adi',
  'aurora',
]);

/**
 * Numeric EVM chain ids for the chains above. Used by `resume()` to rebuild a
 * deposit transfer from an execution alone — the EVM transfer path refuses to
 * run without a target chain id. Mirrors the widget's `EVM_CHAIN_IDS_MAP`.
 */
export const EVM_CHAIN_IDS: Record<string, number> = {
  eth: 1,
  arb: 42161,
  base: 8453,
  bsc: 56,
  op: 10,
  pol: 137,
  avax: 43114,
  scroll: 534352,
  gnosis: 100,
  xlayer: 196,
  bera: 80094,
  monad: 143,
  plasma: 9745,
  adi: 36900,
  aurora: 1313161554,
};

export type ChainFamily = 'evm' | 'sol' | 'stellar' | 'near';

const OMFT_SUFFIX = '.omft.near';

/**
 * Decodes the origin chain and token address baked into a bridged asset id:
 * `nep141:gnosis-0x2a22….omft.near` → `{ chain: 'gnosis', tokenAddress: '0x2a22…' }`,
 * `nep141:base.omft.near` → `{ chain: 'base' }` (the chain's native asset).
 *
 * Returns `undefined` for anything that is not an `*.omft.near` bridged form
 * (NEAR-native nep141 tokens, nep245 multi-tokens) — callers must treat that
 * as "origin unknown", not as an error.
 */
export const parseOriginAsset = (
  assetId: string,
): { chain: string; tokenAddress?: string } | undefined => {
  const [, rest] = assetId.split(':');

  if (!rest?.endsWith(OMFT_SUFFIX)) {
    return undefined;
  }

  const body = rest.slice(0, -OMFT_SUFFIX.length);
  // Chain slugs never contain a dash, so the first one separates the slug
  // from the token address.
  const dash = body.indexOf('-');

  if (dash === -1) {
    return body ? { chain: body } : undefined;
  }

  const chain = body.slice(0, dash);
  const tokenAddress = body.slice(dash + 1);

  return chain && tokenAddress ? { chain, tokenAddress } : undefined;
};

export const isEvmChain = (chain: string): boolean => EVM_CHAINS.has(chain);

export const getChainFamily = (chain: string): ChainFamily | undefined => {
  if (isEvmChain(chain)) {
    return 'evm';
  }

  if (chain === 'sol') {
    return 'sol';
  }

  if (chain === 'stellar') {
    return 'stellar';
  }

  if (chain === 'near') {
    return 'near';
  }

  return undefined;
};
