import {
  ComputeBudgetProgram,
  PublicKey,
  type TransactionInstruction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  BACKEND_PLACEHOLDERS,
  guards,
  type PreparedSteps,
  type SolanaStep,
} from '@aurora-is-near/intents-connect';

/**
 * Convert caller-supplied instructions (e.g. from Jupiter) without decoding or
 * rewriting their bytes. Exclude tips/fee/nonce instructions at the caller;
 * Connect supplies its transaction infrastructure. Compute-budget instructions
 * are omitted here because they are commonly included in build responses.
 */
export const prepareSolanaSteps = (
  instructions: readonly TransactionInstruction[],
  options: {
    intermediary: string;
    addressLookupTables?: readonly (string | PublicKey)[];
  },
): PreparedSteps<SolanaStep> => {
  const intermediary = new PublicKey(options.intermediary).toBase58();
  const steps = instructions
    .filter(
      (instruction) =>
        !instruction.programId.equals(ComputeBudgetProgram.programId),
    )
    .map(
      (instruction): SolanaStep => ({
        programId: instruction.programId.toBase58(),
        discriminator: instruction.data.toString('hex'),
        args: [],
        accounts: instruction.keys.map((account) => ({
          pubkey:
            account.pubkey.toBase58() === intermediary
              ? BACKEND_PLACEHOLDERS.intermediary
              : account.pubkey.toBase58(),
          isSigner: account.isSigner,
          isWritable: account.isWritable,
        })),
      }),
    );

  const addressLookupTables = options.addressLookupTables?.map((table) =>
    table.toString(),
  );

  guards.stepsRequiredForRealCreate(steps);
  guards.solanaStepsAreLegal(steps, addressLookupTables);

  return {
    steps,
    ...(addressLookupTables?.length ? { addressLookupTables } : {}),
  };
};

/** Standard SPL recipient ATA; safe to include even when the account already exists. */
export const createSolanaRecipientAta = (options: {
  intermediary: string;
  recipient: string;
  mint: string;
}) => {
  const mint = new PublicKey(options.mint);
  const recipient = new PublicKey(options.recipient);
  const address = getAssociatedTokenAddressSync(mint, recipient, true);

  return {
    address: address.toBase58(),
    instruction: createAssociatedTokenAccountIdempotentInstruction(
      new PublicKey(options.intermediary),
      address,
      recipient,
      mint,
    ),
  };
};
