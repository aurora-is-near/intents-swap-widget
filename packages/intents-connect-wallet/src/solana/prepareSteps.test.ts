// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { createSolanaRecipientAta, prepareSolanaSteps } from './prepareSteps';

const owner = Keypair.fromSeed(new Uint8Array(32).fill(1)).publicKey;
const recipient = Keypair.fromSeed(new Uint8Array(32).fill(2)).publicKey;
const mint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const instruction = () =>
  new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    data: Buffer.from('00ff1234567890', 'hex'),
    keys: [
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: recipient, isSigner: false, isWritable: false },
    ],
  });

describe('Solana execution instruction preparation', () => {
  it('preserves all bytes, repeated accounts, flags, and lookup-table order', () => {
    const raw = instruction();
    const prepared = prepareSolanaSteps([raw], {
      intermediary: owner.toBase58(),
      addressLookupTables: [mint, recipient.toBase58()],
    });

    expect(prepared).toEqual({
      steps: [
        {
          programId: TOKEN_PROGRAM_ID.toBase58(),
          discriminator: '00ff1234567890',
          args: [],
          accounts: [
            { pubkey: recipient.toBase58(), isSigner: false, isWritable: true },
            { pubkey: '{INTERMEDIARY}', isSigner: true, isWritable: false },
            {
              pubkey: recipient.toBase58(),
              isSigner: false,
              isWritable: false,
            },
          ],
        },
      ],
      addressLookupTables: [mint.toBase58(), recipient.toBase58()],
    });
    expect(raw.keys[1].pubkey).toEqual(owner);
    expect(raw.data.toString('hex')).toBe('00ff1234567890');
  });

  it('omits compute-budget instructions supplied by Connect', () => {
    const compute = ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 });

    expect(
      prepareSolanaSteps([compute, instruction()], {
        intermediary: owner.toBase58(),
      }).steps,
    ).toHaveLength(1);
    expect(() =>
      prepareSolanaSteps([compute], { intermediary: owner.toBase58() }),
    ).toThrow();
  });

  it('rejects instructions needing another signer', () => {
    const raw = instruction();

    raw.keys[0].isSigner = true;

    expect(() =>
      prepareSolanaSteps([raw], { intermediary: owner.toBase58() }),
    ).toThrow('Only {INTERMEDIARY}');
  });

  it('builds the recipient ATA idempotently with the intermediary as the only signer', () => {
    const ata = createSolanaRecipientAta({
      intermediary: owner.toBase58(),
      recipient: recipient.toBase58(),
      mint: mint.toBase58(),
    });

    expect(ata.address).toBe(
      getAssociatedTokenAddressSync(mint, recipient).toBase58(),
    );
    expect(ata.instruction.programId).toEqual(ASSOCIATED_TOKEN_PROGRAM_ID);

    const { steps } = prepareSolanaSteps([ata.instruction], {
      intermediary: owner.toBase58(),
    });

    expect(steps[0].discriminator).toBe('01');
    expect(
      steps[0].accounts
        .filter((account) => account.isSigner)
        .map((account) => account.pubkey),
    ).toEqual(['{INTERMEDIARY}']);
    expect(steps[0].accounts[1].pubkey).toBe(ata.address);
  });
});
