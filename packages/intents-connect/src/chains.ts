/**
 * Chain-family routing. Mirrors `packages/intents-swap-widget/src/utils/chains`
 * but carries only what deposit routing needs — no chain SDKs.
 */

/**
 * Numeric EVM chain ids. Used by `resume()` to rebuild a deposit transfer from
 * an execution alone — the EVM transfer path refuses to run without a target
 * chain id. Mirrors the widget's `EVM_CHAIN_IDS_MAP`.
 *
 * This record is the single registry of known EVM chains: `EVM_CHAINS` is
 * derived from its keys, so a chain can never be "EVM" for routing yet missing
 * its id for resume.
 */
export const EVM_CHAIN_IDS: Readonly<Record<string, number>> = {
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

export const EVM_CHAINS: ReadonlySet<string> = new Set(
  Object.keys(EVM_CHAIN_IDS),
);

/**
 * Chains whose shared deposit address attributes incoming funds by memo —
 * a deposit without one is unattributable and effectively lost.
 */
export const MEMO_MODE_CHAINS = new Set(['stellar']);

/**
 * The chain a wallet's signing standard implies, for executions that do not
 * name their origin (`quote.originAsset` absent or not a bridged `*.omft.near`
 * form). Lives here, next to `MEMO_MODE_CHAINS`, on purpose: the memo guard
 * downstream fails OPEN for any wallet standard this map misses, so a new
 * memo-mode chain must land in both registries in the same edit.
 */
export const SIGNING_STANDARD_CHAINS: Readonly<Record<string, string>> = {
  sep53: 'stellar',
};

/**
 * Signing standards whose origin provably cannot be a memo-mode chain, so the
 * memo guard may be skipped when the origin chain itself is unknown.
 *
 * Deliberately the SAFE list rather than the unsafe one, so the default is to
 * fail CLOSED: a standard nobody has classified here — a new one, or
 * `ton_connect`, whose chain attributes deposits by comment exactly like
 * Stellar — must not slip past the guard just because the inference above
 * came back empty. `sep53` is absent because it resolves to a chain outright.
 */
export const MEMO_FREE_SIGNING_STANDARDS: ReadonlySet<string> = new Set([
  'erc191',
  'raw_ed25519',
  'nep413',
]);

/**
 * Chains whose create body must carry `publicKey` — per the API contract, a
 * TON address cannot yield its public key, so `/execution` needs it up front
 * (every other ed25519 origin supplies it at `/submit` instead).
 */
export const PUBLIC_KEY_REQUIRED_CHAINS = new Set(['ton']);

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
