// @vitest-environment node
import { Buffer } from 'buffer';
import { ComputeBudgetProgram, Keypair, PublicKey } from '@solana/web3.js';
import { createSolanaRecipientAta } from '@aurora-is-near/intents-connect-wallet/solana';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildJupiterSwap, prepareJupiterBuild } from './jupiter';
import { INTERMEDIARY, jupiterFixture, swapInput } from './testFixtures';

beforeEach(() =>
  vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } }),
);

afterEach(() => vi.unstubAllGlobals());

describe('Jupiter instructions', () => {
  it('preserves instruction bytes, account order, duplicate accounts, and lookup tables', () => {
    const build = jupiterFixture();
    const table = Keypair.fromSeed(
      new Uint8Array(32).fill(8),
    ).publicKey.toBase58();

    build.addressesByLookupTableAddress = {
      [table]: build.swapInstruction.accounts.slice(1, 3).map((a) => a.pubkey),
    };
    build.computeBudgetInstructions = [
      {
        programId: ComputeBudgetProgram.programId.toBase58(),
        data: '',
        accounts: [],
      },
    ];
    [build.tipInstruction] = build.computeBudgetInstructions;

    const result = prepareJupiterBuild(build, swapInput());

    expect(result.prepared.steps).toHaveLength(2);
    expect(result.prepared.addressLookupTables).toEqual([table]);
    expect(result.prepared.steps[1]).toMatchObject({
      programId: build.swapInstruction.programId,
      discriminator: '01020304',
      args: [],
      accounts: build.swapInstruction.accounts.map((account) => ({
        ...account,
        pubkey:
          account.pubkey === INTERMEDIARY ? '{INTERMEDIARY}' : account.pubkey,
      })),
    });
    expect(result.prepared.steps[0]!.accounts[2]!.pubkey).toBe(
      '{INTERMEDIARY}',
    );
    expect(result.recipientAta).toBe(build.swapInstruction.accounts[2]!.pubkey);
  });

  it('keeps Jupiter ATA setup without inserting a duplicate create', () => {
    const input = swapInput();
    const build = jupiterFixture(input);
    const { instruction } = createSolanaRecipientAta({
      intermediary: INTERMEDIARY,
      recipient: INTERMEDIARY,
      mint: input.output.mint,
    });

    build.setupInstructions = [
      {
        programId: instruction.programId.toBase58(),
        data: instruction.data.toString('base64'),
        accounts: instruction.keys.map(({ pubkey, ...flags }) => ({
          pubkey: pubkey.toBase58(),
          ...flags,
        })),
      },
    ];

    expect(prepareJupiterBuild(build, input).prepared.steps).toHaveLength(2);
  });

  it.each([
    'inputMint',
    'outputMint',
    'inAmount',
    'swapMode',
    'slippageBps',
    'otherAmountThreshold',
  ] as const)('rejects a mismatching %s', (field) => {
    const build = {
      ...jupiterFixture(),
      [field]: field === 'slippageBps' ? 100 : '0',
    };

    expect(() => prepareJupiterBuild(build, swapInput())).toThrow(
      /different swap|invalid output/,
    );
  });

  it('rejects a foreign signer and a recipient that is not the intermediary ATA', () => {
    const build = jupiterFixture();
    const other = Keypair.fromSeed(
      new Uint8Array(32).fill(9),
    ).publicKey.toBase58();

    build.swapInstruction.accounts.push({
      pubkey: other,
      isSigner: true,
      isWritable: true,
    });

    expect(() => prepareJupiterBuild(build, swapInput())).toThrow();

    build.swapInstruction.accounts = build.swapInstruction.accounts.slice(0, 2);
    build.swapInstruction.accounts.push({
      pubkey: other,
      isSigner: false,
      isWritable: true,
    });

    expect(() => prepareJupiterBuild(build, swapInput())).toThrow(
      /intermediary accounts/,
    );
  });

  it('rejects extra cleanup, unknown setup, and oversized transactions', () => {
    const build = jupiterFixture();

    expect(() =>
      prepareJupiterBuild(
        { ...build, cleanupInstruction: build.swapInstruction },
        swapInput(),
      ),
    ).toThrow(/not supported/);
    expect(() =>
      prepareJupiterBuild(
        { ...build, setupInstructions: [build.swapInstruction] },
        swapInput(),
      ),
    ).toThrow(/setup/);

    build.swapInstruction.data = Buffer.alloc(1200).toString('base64');

    expect(() => prepareJupiterBuild(build, swapInput())).toThrow();
  });

  it('requests exact USDC input into the intermediary ATA without sending a browser API key', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(jupiterFixture()), { status: 200 }),
      );

    vi.stubGlobal('fetch', fetcher);
    await buildJupiterSwap(swapInput());

    const url = fetcher.mock.calls[0]![0] as URL;

    expect(url.searchParams.get('amount')).toBe('9900000');
    expect(url.searchParams.get('taker')).toBe(INTERMEDIARY);
    expect(url.searchParams.get('slippageBps')).toBe('50');
    expect(url.searchParams.get('dexes')).toBe('Hadron');
    expect(url.searchParams.get('destinationTokenAccount')).toBe(
      jupiterFixture().swapInstruction.accounts[2]!.pubkey,
    );
    expect(fetcher.mock.calls[0]![1].headers).toBeUndefined();
    expect(PublicKey.isOnCurve(new PublicKey(INTERMEDIARY))).toBe(true);
  });
});
