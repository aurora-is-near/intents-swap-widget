import { Buffer } from 'buffer';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import {
  BUY_TOKENS,
  JUPITER_PROGRAM,
  SOLANA_USDC,
  SWAP_SLIPPAGE_BPS,
} from './constants';
import type { JupiterBuild, SwapInput } from './jupiter';

export const INTERMEDIARY = Keypair.fromSeed(
  new Uint8Array(32).fill(7),
).publicKey.toBase58();
export const WALLET = '0x0000000000000000000000000000000000000001';
export const SOURCE = {
  assetId: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
  contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  blockchain: 'base',
  decimals: 6,
  isIntent: false,
} as Token;

export const swapInput = (
  amount = '9900000',
  direction: Pick<SwapInput, 'input' | 'output'> = {
    input: SOLANA_USDC,
    output: BUY_TOKENS[0]!,
  },
): SwapInput => ({
  intermediary: INTERMEDIARY,
  amount,
  ...direction,
});

export const jupiterFixture = (input = swapInput()): JupiterBuild => {
  const owner = new PublicKey(input.intermediary);
  const source = getAssociatedTokenAddressSync(
    new PublicKey(input.input.mint),
    owner,
    true,
  ).toBase58();

  const recipient = getAssociatedTokenAddressSync(
    new PublicKey(input.output.mint),
    owner,
    true,
  ).toBase58();

  return {
    inputMint: input.input.mint,
    outputMint: input.output.mint,
    inAmount: input.amount,
    outAmount: (BigInt(input.amount) * 2n).toString(),
    otherAmountThreshold: ((BigInt(input.amount) * 199n) / 100n).toString(),
    swapMode: 'ExactIn',
    slippageBps: SWAP_SLIPPAGE_BPS,
    setupInstructions: [],
    swapInstruction: {
      programId: JUPITER_PROGRAM,
      data: Buffer.from([1, 2, 3, 4]).toString('base64'),
      accounts: [
        { pubkey: input.intermediary, isSigner: true, isWritable: false },
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
      ],
    },
  };
};
