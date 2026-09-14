import { PublicKey } from '@solana/web3.js';
import type { Connection } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  unpackAccount,
} from '@solana/spl-token';

import { BUY_TOKENS, SOLANA_USDC } from './constants';

export const fetchSolanaBalances = async (
  connection: Connection,
  intermediary: string,
) => {
  const owner = new PublicKey(intermediary);
  const tokens = [...BUY_TOKENS, SOLANA_USDC];
  const addresses = tokens.map(({ mint }) =>
    getAssociatedTokenAddressSync(new PublicKey(mint), owner, true),
  );

  const accounts = await connection.getMultipleAccountsInfo(addresses);

  return tokens.map((token, index) => {
    const info = accounts[index];
    const account = info ? unpackAccount(addresses[index]!, info) : undefined;

    if (
      account &&
      (!account.owner.equals(owner) || account.mint.toBase58() !== token.mint)
    ) {
      throw new Error(`Unexpected ${token.symbol} token account`);
    }

    return { ...token, amount: account?.amount.toString() ?? '0' };
  });
};
