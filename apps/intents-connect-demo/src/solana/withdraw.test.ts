// @vitest-environment node
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { describe, expect, it, vi } from 'vitest';
import type { Connection } from '@solana/web3.js';
import type {
  Execution,
  StepsPlan,
  StepsPreview,
} from '@aurora-is-near/intents-connect';

import {
  buildSolanaWithdrawPlan,
  hasUsdcAccount,
  parseSolanaRecipient,
  previewSolanaWithdraw,
} from './withdraw';
import { SOLANA_USDC } from './constants';
import { INTERMEDIARY, WALLET } from './testFixtures';

const RECIPIENT = Keypair.fromSeed(
  new Uint8Array(32).fill(11),
).publicKey.toBase58();

describe('parseSolanaRecipient', () => {
  it('accepts an on-curve wallet address, trimmed', () => {
    expect(parseSolanaRecipient(`  ${RECIPIENT} `).toBase58()).toBe(RECIPIENT);
  });

  it.each([
    ['empty', ''],
    ['not base58', '0xD84368a36ff4F6285F4121ED75E8c1f237E51506'],
    ['too short', 'abc'],
    [
      'an off-curve token account',
      getAssociatedTokenAddressSync(
        new PublicKey(SOLANA_USDC.mint),
        new PublicKey(RECIPIENT),
      ).toBase58(),
    ],
  ])('rejects %s', (_label, value) => {
    expect(() => parseSolanaRecipient(value)).toThrow(
      'Enter a Solana wallet address',
    );
  });
});

describe('buildSolanaWithdrawPlan', () => {
  it('transfers the SDK-sized amount to the recipient ATA after creating it', () => {
    const plan = buildSolanaWithdrawPlan({
      amount: '5000000',
      recipient: RECIPIENT,
    });

    expect(plan).toMatchObject({
      amount: '5000000',
      params: { recipient: RECIPIENT },
      feeFromAmount: { amountReserveBps: 0 },
      previewTtlMs: 30_000,
      recipe: {
        id: 'solana-withdraw-usdc',
        flow: 'steps-only',
        type: 'solana',
        destination: { chain: 'sol', assetId: SOLANA_USDC.assetId },
      },
    });

    if (plan.recipe.type !== 'solana') {
      throw new Error('expected a Solana recipe');
    }

    const prepared = plan.recipe.buildSteps(
      { intermediary: INTERMEDIARY, userAddress: WALLET, amount: '4900000' },
      plan.params,
    );

    if (prepared instanceof Promise) {
      throw new Error('expected synchronous steps');
    }

    const owner = new PublicKey(INTERMEDIARY);
    const mint = new PublicKey(SOLANA_USDC.mint);
    const source = getAssociatedTokenAddressSync(mint, owner, true).toBase58();
    const destination = getAssociatedTokenAddressSync(
      mint,
      new PublicKey(RECIPIENT),
    ).toBase58();

    expect(prepared.steps).toHaveLength(2);
    expect(prepared.steps[0]).toMatchObject({
      programId: ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
      discriminator: '01',
      accounts: [
        { pubkey: '{INTERMEDIARY}', isSigner: true, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: RECIPIENT, isSigner: false, isWritable: false },
        { pubkey: SOLANA_USDC.mint, isSigner: false, isWritable: false },
        {
          pubkey: SystemProgram.programId.toBase58(),
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: TOKEN_PROGRAM_ID.toBase58(),
          isSigner: false,
          isWritable: false,
        },
      ],
    });
    // TransferChecked: tag 12, u64 LE amount 4 900 000 (0x4ac4a0), decimals 6.
    expect(prepared.steps[1]).toMatchObject({
      programId: TOKEN_PROGRAM_ID.toBase58(),
      discriminator: '0ca0c44a000000000006',
      accounts: [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: SOLANA_USDC.mint, isSigner: false, isWritable: false },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: '{INTERMEDIARY}', isSigner: true, isWritable: false },
      ],
    });
    expect(prepared.addressLookupTables).toBeUndefined();
  });

  it('rejects an invalid recipient before building anything', () => {
    expect(() =>
      buildSolanaWithdrawPlan({ amount: '1', recipient: 'nope' }),
    ).toThrow('Enter a Solana wallet address');
  });
});

const connectionWith = (account: object | null) =>
  ({
    getMultipleAccountsInfo: vi.fn().mockResolvedValue([account]),
  }) as unknown as Connection;

describe('hasUsdcAccount', () => {
  it('looks up the recipient USDC ATA', async () => {
    const connection = connectionWith({ lamports: 1 });

    await expect(hasUsdcAccount(connection, RECIPIENT)).resolves.toBe(true);
    await expect(hasUsdcAccount(connectionWith(null), RECIPIENT)).resolves.toBe(
      false,
    );

    const [[addresses]] = vi.mocked(connection.getMultipleAccountsInfo).mock
      .calls as unknown as [[PublicKey[]]];

    expect(addresses[0]!.toBase58()).toBe(
      getAssociatedTokenAddressSync(
        new PublicKey(SOLANA_USDC.mint),
        new PublicKey(RECIPIENT),
      ).toBase58(),
    );
  });
});

describe('previewSolanaWithdraw', () => {
  const previewFor =
    (expiresAt: string) =>
    async <TParams>(
      input: StepsPlan<TParams>,
    ): Promise<StepsPreview<TParams>> => ({
      execution: {} as Execution,
      networkFee: '100000',
      spendable: '4900000',
      plan: {
        ...input,
        prepared: {
          steps: [],
          walletAddress: WALLET,
          intermediary: INTERMEDIARY,
          amount: input.amount,
          spendable: '4900000',
          networkFee: '100000',
          feeBudget: '100000',
          expiresAt,
        },
      },
    });

  it('shows the post-fee amount as both estimate and minimum', async () => {
    const plan = buildSolanaWithdrawPlan({
      amount: '5000000',
      recipient: RECIPIENT,
    });

    const expiresAt = new Date(Date.now() + 30_000).toISOString();
    const previewed: unknown[] = [];
    const previewSteps = async <TParams>(input: StepsPlan<TParams>) => {
      previewed.push(input);

      return previewFor(expiresAt)(input);
    };

    const quote = await previewSolanaWithdraw(
      { previewSteps },
      plan,
      connectionWith({ lamports: 1 }),
    );

    expect(previewed).toEqual([plan]);
    expect(quote).toMatchObject({
      receive: '4900000',
      minimumReceive: '4900000',
      networkFee: '100000',
      expiresAt: Date.parse(expiresAt),
    });
    expect(quote.warning).toBeUndefined();
  });

  it('warns when the recipient has no USDC account yet', async () => {
    const plan = buildSolanaWithdrawPlan({
      amount: '5000000',
      recipient: RECIPIENT,
    });

    const quote = await previewSolanaWithdraw(
      { previewSteps: previewFor(new Date(Date.now() + 30_000).toISOString()) },
      plan,
      connectionWith(null),
    );

    expect(quote.warning).toMatch(/no USDC account yet/);
  });
});
