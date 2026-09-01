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

const ALCHEMY_RPC_BASE = 'https://solana-mainnet.g.alchemy.com/v2';
const DEFAULT_RPC_URL = 'https://solana-rpc.publicnode.com';

const resolveRpcUrl = ({ rpcUrl, alchemyApiKey }: MakeTransferOptions) =>
  rpcUrl ??
  (alchemyApiKey ? `${ALCHEMY_RPC_BASE}/${alchemyApiKey}` : DEFAULT_RPC_URL);

export const makeTransfer = async (
  args: MakeTransferArgs,
  options: MakeTransferOptions,
): Promise<Pick<TransferResult, 'hash'>> => {
  const { provider } = options;
  const connection = new Connection(resolveRpcUrl(options));

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

    return { hash };
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

  const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

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

  return { hash };
};
