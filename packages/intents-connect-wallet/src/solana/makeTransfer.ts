import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
  type MakeTransfer,
  type MakeTransferArgs,
  resolveTransferAmount,
  type TransferResult,
} from '@aurora-is-near/intents-connect';

import type { SolanaTransferOptions } from '@/solana/types';

const DEFAULT_RPC_URL = 'https://solana-rpc.publicnode.com';

const resolveConnection = ({
  connection,
  rpcUrl,
}: SolanaTransferOptions): Connection =>
  connection ?? new Connection(rpcUrl ?? DEFAULT_RPC_URL);

const sendSigned = async (
  connection: Connection,
  transaction: Transaction,
  { provider }: SolanaTransferOptions,
  feePayer: PublicKey,
): Promise<Pick<TransferResult, 'hash'>> => {
  const { blockhash } = await connection.getLatestBlockhash();

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = feePayer;

  const signedTx = await provider.signTransaction(transaction);
  const hash = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  return { hash };
};

/**
 * Sends the origin-chain deposit for a Solana origin.
 *
 * Ported from `@aurora-is-near/intents-swap-widget-solana`. Transfer mechanics
 * are unchanged; the RPC endpoint is configurable rather than Alchemy-only.
 */
export const makeTransfer: MakeTransfer<SolanaTransferOptions> = async (
  args: MakeTransferArgs,
  options: SolanaTransferOptions,
): Promise<Pick<TransferResult, 'hash'>> => {
  if (!options?.provider) {
    throw new Error(
      'Solana transfer requires pluginOptions.provider (a SolanaProvider)',
    );
  }

  const connection = resolveConnection(options);

  if (!options.provider.publicKey) {
    throw new Error('No public key found in Solana provider.');
  }

  // Normalized rather than cast: the SolanaProvider contract only promises a
  // `{ toString(): string }`, not a web3.js PublicKey with `.toBuffer()`.
  const fromPubkey = new PublicKey(options.provider.publicKey.toString());

  const toPubkey = new PublicKey(args.address);
  const amount = resolveTransferAmount(args);

  if (!args.tokenAddress) {
    const transaction = new Transaction().add(
      SystemProgram.transfer({ fromPubkey, toPubkey, lamports: amount }),
    );

    return sendSigned(connection, transaction, options, fromPubkey);
  }

  const mintPubkey = new PublicKey(args.tokenAddress);
  const fromTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    fromPubkey,
  );

  // allowOwnerOffCurve: the 1Click deposit address may be a PDA.
  const toTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    toPubkey,
    true,
  );

  const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
  const transaction = new Transaction();

  if (!toAccountInfo) {
    // Idempotent: a concurrently created ATA must not fail the signed tx.
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        fromPubkey,
        toTokenAccount,
        toPubkey,
        mintPubkey,
      ),
    );
  }

  transaction.add(
    createTransferCheckedInstruction(
      fromTokenAccount,
      mintPubkey,
      toTokenAccount,
      fromPubkey,
      amount,
      args.decimals,
    ),
  );

  return sendSigned(connection, transaction, options, fromPubkey);
};
