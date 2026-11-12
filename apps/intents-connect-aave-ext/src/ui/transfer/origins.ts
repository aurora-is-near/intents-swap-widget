import {
  type BalanceToken,
  type ChainFamily,
  getChainFamily,
  type SupportedToken,
} from '@aurora-is-near/intents-connect';

/**
 * The chain families a transfer can be paid from. The service refunds to the
 * signing wallet's own address on the origin chain, so the signer must be in
 * the origin's family. A TON signer and a Stellar origin are both refused in
 * this mode (checked by dry create), so neither is offered.
 */
const TRANSFER_FAMILIES = ['evm', 'sol', 'tron', 'near'] as const;

export type TransferFamily = (typeof TRANSFER_FAMILIES)[number];

/** A token the user can send to a deposit address, from anywhere. */
export type TransferOrigin = {
  /** 1Click asset id. */
  id: string;
  token: BalanceToken;
  family: TransferFamily;
};

const isTransferFamily = (
  family: ChainFamily | undefined,
): family is TransferFamily =>
  (TRANSFER_FAMILIES as readonly string[]).includes(family ?? '');

/** Listed by the service, but not for users. */
const HIDDEN = /\(deprecated\)|^test/i;

/** Asked for most: stablecoins, then native coins. */
const SYMBOL_RANK = [
  'USDC',
  'USDT',
  'ETH',
  'BTC',
  'SOL',
  'BNB',
  'TRX',
  'NEAR',
  'POL',
  'AVAX',
];

/** The networks exchanges withdraw to most. */
const CHAIN_RANK = [
  'eth',
  'base',
  'arb',
  'sol',
  'tron',
  'bsc',
  'op',
  'pol',
  'avax',
  'near',
];

const rankOf = (list: readonly string[], value: string) => {
  const index = list.indexOf(value);

  return index === -1 ? list.length : index;
};

const byPopularity = (a: TransferOrigin, b: TransferOrigin) =>
  rankOf(SYMBOL_RANK, a.token.symbol.toUpperCase()) -
    rankOf(SYMBOL_RANK, b.token.symbol.toUpperCase()) ||
  rankOf(CHAIN_RANK, a.token.blockchain) -
    rankOf(CHAIN_RANK, b.token.blockchain) ||
  a.token.symbol.localeCompare(b.token.symbol) ||
  a.token.blockchain.localeCompare(b.token.blockchain);

/**
 * What can be sent from anywhere: the service's origins on the chains a
 * transfer supports, as the `BalanceToken` a plan is built from, most asked
 * for first. Rows missing a field, deprecated and test tokens are left out.
 */
export const transferOrigins = (
  tokens: readonly SupportedToken[],
): TransferOrigin[] => {
  const seen = new Set<string>();

  return tokens
    .flatMap((token): TransferOrigin[] => {
      const { assetId, symbol, blockchain, decimals } = token;

      if (
        !assetId ||
        !symbol ||
        !blockchain ||
        decimals === undefined ||
        HIDDEN.test(symbol) ||
        seen.has(assetId)
      ) {
        return [];
      }

      const family = getChainFamily(blockchain);

      if (!isTransferFamily(family)) {
        return [];
      }

      seen.add(assetId);

      return [
        {
          id: assetId,
          family,
          token: {
            assetId,
            symbol,
            blockchain,
            decimals,
            // A chain's native token can come back as "".
            contractAddress:
              token.contractAddress === '' ? undefined : token.contractAddress,
            price: token.price ?? 0,
          },
        },
      ];
    })
    .sort(byPopularity);
};

/** Rows whose symbol or chain name contains `query`, case-insensitively. */
export const filterOrigins = (
  origins: readonly TransferOrigin[],
  query: string,
  chainName: (blockchain: string) => string,
): readonly TransferOrigin[] => {
  const needle = query.trim().toLowerCase();

  return needle
    ? origins.filter(
        ({ token }) =>
          token.symbol.toLowerCase().includes(needle) ||
          chainName(token.blockchain).toLowerCase().includes(needle),
      )
    : origins;
};
