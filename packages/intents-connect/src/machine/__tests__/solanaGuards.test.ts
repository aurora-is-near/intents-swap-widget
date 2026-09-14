import { describe, expect, it } from 'vitest';
import {
  solanaStepsAreLegal,
  stepShapeIsLegal,
  strategiesAreExclusive,
} from '@/machine/guards';
import type { SolanaArg, SolanaStep } from '@/types/execution';

const PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const step = (): SolanaStep => ({
  programId: PROGRAM,
  discriminator: '0c',
  args: [{ name: 'amount', type: 'u64', value: '1000' }],
  accounts: [
    { pubkey: MINT, isSigner: false, isWritable: true },
    { pubkey: '{INTERMEDIARY}', isSigner: true, isWritable: false },
  ],
});

describe('Solana step validation', () => {
  it('preserves ordered accounts and accepts exact integers and opaque bytes', () => {
    const value = step();

    value.args = [
      { name: 'amount', type: 'u64', value: '18446744073709551615' },
    ];
    const before = JSON.stringify(value);

    solanaStepsAreLegal([value], [MINT]);

    expect(JSON.stringify(value)).toBe(before);
    expect(() =>
      stepShapeIsLegal(
        [{ ...value, discriminator: '00ff12345678', args: [] }],
        'solana',
      ),
    ).not.toThrow();
  });

  it.each([
    { programId: '{INTERMEDIARY}' },
    { discriminator: '0x00' },
    { discriminator: '0' },
    { discriminator: '{MIN_AMOUNT_OUT}' },
    { accounts: [] },
    { accounts: [{ pubkey: MINT, isSigner: true, isWritable: false }] },
    { accounts: [{ pubkey: 'invalid', isSigner: false, isWritable: false }] },
    { accounts: [{ pubkey: MINT, isSigner: 'true', isWritable: false }] },
    { to: '0xEvm' },
    { programId: 'ComputeBudget111111111111111111111111111111' },
  ])('rejects invalid Solana shape %j', (change) => {
    expect(() =>
      solanaStepsAreLegal([{ ...step(), ...change } as SolanaStep]),
    ).toThrow();
  });

  it.each([
    { type: 'u8', value: 256 },
    { type: 'u64', value: '-1' },
    { type: 'u64', value: 9007199254740992 },
    { type: 'i8', value: '-129' },
    { type: 'bytes', value: '0x01' },
    { type: 'pubkey', value: 'invalid' },
    { type: 'bool', value: 'true' },
    { type: 'vec', value: [] },
  ])('rejects invalid argument %j', (arg) => {
    expect(() =>
      solanaStepsAreLegal([
        { ...step(), args: [{ name: 'value', ...arg } as SolanaArg] },
      ]),
    ).toThrow();
  });

  it('validates typed placeholders without accepting them inside opaque instruction bytes', () => {
    const steps = [
      {
        ...step(),
        args: [
          { name: 'amount', type: 'u64' as const, value: '{MIN_AMOUNT_OUT}' },
        ],
      },
    ];

    expect(() => solanaStepsAreLegal(steps)).not.toThrow();
    expect(() =>
      strategiesAreExclusive({ kind: 'threeRound' }, steps),
    ).toThrow();
  });

  it('rejects invalid table addresses and excessive table, step, and payload sizes', () => {
    expect(() => solanaStepsAreLegal([step()], ['bad'])).toThrow();
    expect(() => solanaStepsAreLegal([step()], Array(17).fill(MINT))).toThrow();
    expect(() => solanaStepsAreLegal(Array(51).fill(step()))).toThrow();
    expect(() =>
      solanaStepsAreLegal([
        { ...step(), discriminator: '00'.repeat(256 * 1024) },
      ]),
    ).toThrow();
  });

  it('keeps EVM and Solana instruction shapes separate', () => {
    const evm = {
      to: '0xToken',
      value: '0',
      parameters: [],
      functionSignature: '',
    };

    expect(() => stepShapeIsLegal([evm], 'evm')).not.toThrow();
    expect(() => stepShapeIsLegal([evm], 'solana')).toThrow();
    expect(() => stepShapeIsLegal([step()], 'evm')).toThrow();
  });
});
