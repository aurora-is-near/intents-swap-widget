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
import { validateMints } from './client';
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

const connection = (accounts: (AccountInfo<Buffer> | null)[]) =>
  ({
    getMultipleAccountsInfo: vi.fn().mockResolvedValue(accounts),
  }) as unknown as Connection;

describe('intermediary balances', () => {
  it('reads exact integer balances from intermediary ATAs, with missing accounts as zero', async () => {
    const rpc = connection([
      account(BUY_TOKENS[0]!.mint, 9007199254740993n),
      null,
      account(SOLANA_USDC.mint, 4200n),
    ]);

    const balances = await fetchSolanaBalances(rpc, INTERMEDIARY);

    expect(balances.map(({ symbol, amount }) => ({ symbol, amount }))).toEqual([
      { symbol: 'ORCA', amount: '9007199254740993' },
      { symbol: 'KMNO', amount: '0' },
      { symbol: 'USDC', amount: '4200' },
    ]);
    expect(rpc.getMultipleAccountsInfo).toHaveBeenCalledTimes(1);
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
    const data = Buffer.alloc(MintLayout.span);

    MintLayout.encode(
      {
        mintAuthorityOption: 0,
        mintAuthority: PublicKey.default,
        supply: 1000n,
        decimals: 6,
        isInitialized: true,
        freezeAuthorityOption: 0,
        freezeAuthority: PublicKey.default,
      },
      data,
    );
    const info = {
      data,
      executable: false,
      lamports: 1,
      owner: TOKEN_PROGRAM_ID,
      rentEpoch: 0,
    };

    await expect(
      validateMints(connection([info, info]), BUY_TOKENS[0]!),
    ).resolves.toBeUndefined();
    await expect(
      validateMints(
        connection([info, { ...info, owner: TOKEN_2022_PROGRAM_ID }]),
        BUY_TOKENS[0]!,
      ),
    ).rejects.toThrow(/standard SPL/);
    await expect(
      validateMints(connection([info, info]), {
        ...BUY_TOKENS[0]!,
        decimals: 9,
      }),
    ).rejects.toThrow(/metadata/);
  });
});
