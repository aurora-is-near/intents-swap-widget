import { Connection, PublicKey } from '@solana/web3.js';
import type { AccountInfo } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, unpackMint } from '@solana/spl-token';

import { SOLANA_RPC_URL } from './config';
import type { SolanaToken } from './constants';

export const getSolanaConnection = () =>
  new Connection(new URL(SOLANA_RPC_URL, window.location.origin).href, {
    commitment: 'confirmed',
    disableRetryOnRateLimit: true,
  });

/**
 * Public RPCs cap `getMultipleAccounts` well below the protocol's 100:
 * publicnode answers 11 or more addresses with a 403 "Request blocked".
 */
export const RPC_ACCOUNTS_PER_REQUEST = 10;

/** `getMultipleAccountsInfo` in RPC-sized chunks, results in input order. */
export const getAccountsInfo = async (
  connection: Connection,
  addresses: readonly PublicKey[],
): Promise<(AccountInfo<Buffer> | null)[]> => {
  const chunks: PublicKey[][] = [];

  for (let i = 0; i < addresses.length; i += RPC_ACCOUNTS_PER_REQUEST) {
    chunks.push(addresses.slice(i, i + RPC_ACCOUNTS_PER_REQUEST));
  }

  const results = await Promise.all(
    chunks.map((chunk) => connection.getMultipleAccountsInfo(chunk)),
  );

  return results.flat();
};

export const validateMints = async (
  connection: Connection,
  tokens: readonly SolanaToken[],
) => {
  const addresses = tokens.map(({ mint }) => new PublicKey(mint));
  const accounts = await getAccountsInfo(connection, addresses);

  tokens.forEach((token, index) => {
    const account = accounts[index];

    if (!account?.owner.equals(TOKEN_PROGRAM_ID)) {
      throw new Error(
        `${token.symbol} must use the standard SPL token program`,
      );
    }

    const mint = unpackMint(addresses[index]!, account);

    if (!mint.isInitialized || mint.decimals !== token.decimals) {
      throw new Error(`Unexpected ${token.symbol} mint metadata`);
    }
  });
};
