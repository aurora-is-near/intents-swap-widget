// @vitest-environment node
import { Buffer } from 'buffer';
import { Keypair, PublicKey } from '@solana/web3.js';
import type { AccountInfo, Connection } from '@solana/web3.js';
import {
  AccountLayout,
  AccountState,
  MintLayout,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { describe, expect, it, vi } from 'vitest';

import { BUY_TOKENS, SOLANA_USDC } from './constants';
import { fetchSolanaBalances } from './balances';
import { RPC_ACCOUNTS_PER_REQUEST, validateMints } from './client';
import { INTERMEDIARY } from './testFixtures';

const account = (mint: string, amount: bigint): AccountInfo<Buffer> => {
  const data = Buffer.alloc(AccountLayout.span);
  const owner = new PublicKey(INTERMEDIARY);

  AccountLayout.encode(
    {
      mint: new PublicKey(mint),
      owner,
      amount,
      delegateOption: 0,
      delegate: PublicKey.default,
      state: AccountState.Initialized,
      isNativeOption: 0,
      isNative: 0n,
      delegatedAmount: 0n,
      closeAuthorityOption: 0,
      closeAuthority: PublicKey.default,
    },
    data,
  );

  return {
    data,
    executable: false,
    lamports: 2039280,
    owner: TOKEN_PROGRAM_ID,
    rentEpoch: 0,
  };
};

// Hands the accounts out in request order, one RPC-sized chunk per call, the
// way a real node answers consecutive `getMultipleAccounts` requests.
const connection = (accounts: (AccountInfo<Buffer> | null)[]) => {
  const queue = [...accounts];

  return {
    getMultipleAccountsInfo: vi
      .fn()
      .mockImplementation(async (keys: PublicKey[]) =>
        queue.splice(0, keys.length),
      ),
  } as unknown as Connection;
};

describe('intermediary balances', () => {
  it('reads exact integer balances from intermediary ATAs, with missing accounts as zero', async () => {
    // One ATA per buyable asset, then USDC; only the first and USDC exist.
    const rpc = connection([
      account(BUY_TOKENS[0]!.mint, 9007199254740993n),
      ...BUY_TOKENS.slice(1).map(() => null),
      account(SOLANA_USDC.mint, 4200n),
    ]);

    const balances = await fetchSolanaBalances(rpc, INTERMEDIARY);

    expect(balances.map(({ symbol, amount }) => ({ symbol, amount }))).toEqual([
      { symbol: BUY_TOKENS[0]!.symbol, amount: '9007199254740993' },
      ...BUY_TOKENS.slice(1).map(({ symbol }) => ({ symbol, amount: '0' })),
      { symbol: 'USDC', amount: '4200' },
    ]);

    // publicnode blocks requests for more than ten accounts.
    const { calls } = vi.mocked(rpc.getMultipleAccountsInfo).mock;

    expect(calls).toHaveLength(
      Math.ceil((BUY_TOKENS.length + 1) / RPC_ACCOUNTS_PER_REQUEST),
    );

    calls.forEach(([keys]) => {
      expect(keys.length).toBeLessThanOrEqual(RPC_ACCOUNTS_PER_REQUEST);
    });
  });

  it('does not turn RPC failures, wrong owners, or wrong mints into empty balances', async () => {
    const rpc = connection([]);

    vi.mocked(rpc.getMultipleAccountsInfo).mockRejectedValue(
      new Error('RPC unavailable'),
    );

    await expect(fetchSolanaBalances(rpc, INTERMEDIARY)).rejects.toThrow(
      'RPC unavailable',
    );
    await expect(
      fetchSolanaBalances(
        connection([account(SOLANA_USDC.mint, 1n)]),
        INTERMEDIARY,
      ),
    ).rejects.toThrow(/Unexpected/);
    await expect(
      fetchSolanaBalances(
        connection([account(BUY_TOKENS[0]!.mint, 1n)]),
        Keypair.fromSeed(new Uint8Array(32).fill(9)).publicKey.toBase58(),
      ),
    ).rejects.toThrow(/Unexpected/);
  });

  it('verifies token programs and decimals before quoting', async () => {
    const mintInfo = (decimals: number) => {
      const data = Buffer.alloc(MintLayout.span);

      MintLayout.encode(
        {
          mintAuthorityOption: 0,
          mintAuthority: PublicKey.default,
          supply: 1000n,
          decimals,
          isInitialized: true,
          freezeAuthorityOption: 0,
          freezeAuthority: PublicKey.default,
        },
        data,
      );

      return {
        data,
        executable: false,
        lamports: 1,
        owner: TOKEN_PROGRAM_ID,
        rentEpoch: 0,
      };
    };

    const bought = BUY_TOKENS[0]!;
    const usdcInfo = mintInfo(SOLANA_USDC.decimals);
    const boughtInfo = mintInfo(bought.decimals);

    await expect(
      validateMints(connection([usdcInfo, boughtInfo]), [SOLANA_USDC, bought]),
    ).resolves.toBeUndefined();
    await expect(
      validateMints(
        connection([usdcInfo, { ...boughtInfo, owner: TOKEN_2022_PROGRAM_ID }]),
        [SOLANA_USDC, bought],
      ),
    ).rejects.toThrow(/standard SPL/);
    await expect(
      validateMints(connection([usdcInfo, boughtInfo]), [
        SOLANA_USDC,
        { ...bought, decimals: bought.decimals + 1 },
      ]),
    ).rejects.toThrow(/metadata/);
  });
});
