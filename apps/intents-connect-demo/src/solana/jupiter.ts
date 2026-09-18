import { Buffer } from 'buffer';
import {
  AddressLookupTableAccount,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  createSolanaRecipientAta,
  prepareSolanaSteps,
} from '@aurora-is-near/intents-connect-wallet/solana';

import { JUPITER_BUILD_URL } from './config';
import { JUPITER_PROGRAM, SWAP_SLIPPAGE_BPS } from './constants';
import type { SolanaToken } from './constants';

export type JupiterInstruction = {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
};

export type JupiterBuild = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  setupInstructions: JupiterInstruction[];
  swapInstruction: JupiterInstruction;
  cleanupInstruction?: JupiterInstruction | null;
  otherInstructions?: JupiterInstruction[];
  computeBudgetInstructions?: JupiterInstruction[];
  tipInstruction?: JupiterInstruction | null;
  addressesByLookupTableAddress?: Record<string, string[]> | null;
};

export type SwapInput = {
  intermediary: string;
  /** Atomic amount of `input` to swap, exact-in. */
  amount: string;
  input: SolanaToken;
  output: SolanaToken;
};

const positiveAmount = (value: string) =>
  typeof value === 'string' && /^\d+$/.test(value) && BigInt(value) > 0n;

const decodeInstruction = (instruction: JupiterInstruction) => {
  if (
    !instruction ||
    typeof instruction.data !== 'string' ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      instruction.data,
    ) ||
    !Array.isArray(instruction.accounts) ||
    instruction.accounts.some(
      (account) =>
        typeof account.isSigner !== 'boolean' ||
        typeof account.isWritable !== 'boolean',
    )
  ) {
    throw new Error('Unsupported Jupiter instruction encoding');
  }

  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    data: Buffer.from(instruction.data, 'base64'),
    keys: instruction.accounts.map(({ pubkey, ...flags }) => ({
      pubkey: new PublicKey(pubkey),
      ...flags,
    })),
  });
};

// Standard SPL -> standard SPL needs only idempotent ATA setup and the swap itself.
// Reject additional instruction shapes until they have been tested with Connect.
const validateSetup = (
  instruction: TransactionInstruction,
  owner: PublicKey,
) => {
  const [payer, ata, authority, mint, system, tokenProgram] = instruction.keys;

  if (
    !instruction.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID) ||
    instruction.data.toString('hex') !== '01' ||
    instruction.keys.length !== 6 ||
    !payer?.pubkey.equals(owner) ||
    !authority?.pubkey.equals(owner) ||
    !system?.pubkey.equals(SystemProgram.programId) ||
    !tokenProgram?.pubkey.equals(TOKEN_PROGRAM_ID) ||
    !mint ||
    !ata?.isWritable ||
    !ata.pubkey.equals(getAssociatedTokenAddressSync(mint.pubkey, owner, true))
  ) {
    throw new Error(
      'Unsupported Jupiter setup: expected an intermediary-owned SPL ATA',
    );
  }
};

export const prepareJupiterBuild = (build: JupiterBuild, input: SwapInput) => {
  if (
    build.inputMint !== input.input.mint ||
    build.outputMint !== input.output.mint ||
    build.inAmount !== input.amount ||
    build.swapMode !== 'ExactIn' ||
    build.slippageBps !== SWAP_SLIPPAGE_BPS ||
    !positiveAmount(build.outAmount) ||
    !positiveAmount(build.otherAmountThreshold) ||
    BigInt(build.otherAmountThreshold) > BigInt(build.outAmount)
  ) {
    throw new Error(
      'Jupiter returned a different swap or invalid output amounts',
    );
  }

  if (
    build.cleanupInstruction != null ||
    (build.otherInstructions?.length ?? 0) > 0
  ) {
    throw new Error(
      'This Jupiter route needs instructions not supported by the demo',
    );
  }

  const owner = new PublicKey(input.intermediary);
  const recipient = createSolanaRecipientAta({
    intermediary: input.intermediary,
    recipient: input.intermediary,
    mint: input.output.mint,
  });

  const setup = build.setupInstructions.map(decodeInstruction);

  setup.forEach((instruction) => validateSetup(instruction, owner));

  const swap = decodeInstruction(build.swapInstruction);
  const source = getAssociatedTokenAddressSync(
    new PublicKey(input.input.mint),
    owner,
    true,
  );

  if (
    !swap.programId.equals(new PublicKey(JUPITER_PROGRAM)) ||
    !swap.keys.some((key) => key.isSigner && key.pubkey.equals(owner)) ||
    !swap.keys.some((key) => key.isWritable && key.pubkey.equals(source)) ||
    !swap.keys.some(
      (key) => key.isWritable && key.pubkey.toBase58() === recipient.address,
    )
  ) {
    throw new Error(
      'Jupiter must swap from and to the Connect intermediary accounts',
    );
  }

  const hasRecipientSetup = setup.some(
    (ix) => ix.keys[1]?.pubkey.toBase58() === recipient.address,
  );

  const instructions = [
    ...setup,
    ...(!hasRecipientSetup ? [recipient.instruction] : []),
    swap,
  ];

  const lookupEntries = Object.entries(
    build.addressesByLookupTableAddress ?? {},
  );

  const prepared = prepareSolanaSteps(instructions, {
    intermediary: input.intermediary,
    addressLookupTables: lookupEntries.map(([address]) => address),
  });

  // A lower bound only: Connect additionally inserts its payer, nonce, and fees.
  // The full transaction size and compute limit must pass deployment validation.
  const tables = lookupEntries.map(
    ([address, addresses]) =>
      new AddressLookupTableAccount({
        key: new PublicKey(address),
        state: {
          deactivationSlot: 18446744073709551615n,
          lastExtendedSlot: 0,
          lastExtendedSlotStartIndex: 0,
          addresses: addresses.map((value) => new PublicKey(value)),
        },
      }),
  );

  const message = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: SystemProgram.programId.toBase58(),
    instructions,
  }).compileToV0Message(tables);

  if (new VersionedTransaction(message).serialize().length > 1232) {
    throw new Error('Jupiter route exceeds the Solana transaction size limit');
  }

  return {
    prepared,
    inputAmount: build.inAmount,
    estimatedOutput: build.outAmount,
    minimumOutput: build.otherAmountThreshold,
    recipientAta: recipient.address,
  };
};

export const buildJupiterSwap = async (input: SwapInput) => {
  if (!positiveAmount(input.amount)) {
    throw new Error(`Nothing to swap: no ${input.input.symbol} amount remains`);
  }

  const recipient = getAssociatedTokenAddressSync(
    new PublicKey(input.output.mint),
    new PublicKey(input.intermediary),
    true,
  );

  const url = new URL(JUPITER_BUILD_URL, window.location.origin);

  url.search = new URLSearchParams({
    inputMint: input.input.mint,
    outputMint: input.output.mint,
    amount: input.amount,
    taker: input.intermediary,
    destinationTokenAccount: recipient.toBase58(),
    slippageBps: String(SWAP_SLIPPAGE_BPS),
    wrapAndUnwrapSol: 'false',
    maxAccounts: '32',
    dexes: 'Hadron',
  }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });

  if (!response.ok) {
    // The local proxy returns a useful configuration error for a missing key.
    const message = await response.text();

    throw new Error(
      `Jupiter build failed (${response.status}): ${message.slice(0, 300)}`,
    );
  }

  return prepareJupiterBuild((await response.json()) as JupiterBuild, input);
};
