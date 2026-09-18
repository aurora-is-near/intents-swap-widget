import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, unpackMint } from '@solana/spl-token';

import { SOLANA_RPC_URL } from './config';
import type { SolanaToken } from './constants';

export const getSolanaConnection = () =>
  new Connection(new URL(SOLANA_RPC_URL, window.location.origin).href, {
    commitment: 'confirmed',
    disableRetryOnRateLimit: true,
  });

export const validateMints = async (
  connection: Connection,
  tokens: readonly SolanaToken[],
) => {
  const addresses = tokens.map(({ mint }) => new PublicKey(mint));
  const accounts = await connection.getMultipleAccountsInfo(addresses);

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
