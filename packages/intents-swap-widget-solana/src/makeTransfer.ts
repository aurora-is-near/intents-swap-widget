import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import type {
  MakeTransferArgs,
  TransferResult,
} from '@aurora-is-near/intents-swap-widget';
import { MakeTransferOptions } from './types';

export const makeTransfer = async (
  args: MakeTransferArgs,
  { provider, alchemyApiKey }: MakeTransferOptions,
): Promise<TransferResult> => {
  const connection = new Connection(
    `https://solana-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
  );

  const fromPubkey = provider.publicKey as PublicKey | undefined;

  if (!fromPubkey) {
    throw new Error('No public key found in Solana provider.');
  }

  const toPubkey = new PublicKey(args.address);

  if (!args.tokenAddress) {
    const lamports = BigInt(args.amount);

    if (lamports <= 0n) {
      throw new Error('Transfer amount must be positive');
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      }),
    );

    const { blockhash } = await connection.getLatestBlockhash();

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const signedTx = await provider.signTransaction(transaction);
    const hash = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    return {
      hash,
      transactionLink: `https://solscan.io/tx/${hash}`,
    };
  }

  const tokenAmount = BigInt(args.amount);

  if (tokenAmount <= 0n) {
    throw new Error('Transfer amount must be positive');
  }

  const mintPubkey = new PublicKey(args.tokenAddress);
  const fromTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    fromPubkey,
  );

  const toTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    toPubkey,
  );

  const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
  const transaction = new Transaction();

  if (!toAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        toTokenAccount,
        toPubkey,
        mintPubkey,
      ),
    );
  }

  transaction.add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPubkey,
      tokenAmount,
    ),
  );

  const { blockhash } = await connection.getLatestBlockhash();

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  const signedTx = await provider.signTransaction(transaction);
  const hash = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  return {
    hash,
    transactionLink: `https://solscan.io/tx/${hash}`,
  };
};
