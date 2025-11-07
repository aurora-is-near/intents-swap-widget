import type { MakeTransferArgs } from '../types';

type SolanaProvider = {
  publicKey: {
    toBase58(): string;
  } | null;
  signTransaction<T>(transaction: T): Promise<T>;
};

type UseMakeSolanaTransferArgs = {
  provider?: SolanaProvider;
  alchemyApiKey?: string;
};

export const useMakeSolanaTransfer = ({
  provider,
  alchemyApiKey,
}: UseMakeSolanaTransferArgs) => {
  const make = async (args: MakeTransferArgs) => {
    if (!provider?.publicKey) {
      throw new Error('No Solana wallet connected');
    }

    if (!alchemyApiKey) {
      throw new Error('Alchemy API key is required for Solana transfers');
    }

    // Dynamic import to avoid bundling Solana libraries for non-Solana users
    // This keeps the main bundle smaller and only loads Solana code when needed
    const { Connection, PublicKey, SystemProgram, Transaction } = await import(
      '@solana/web3.js'
    );

    const connection = new Connection(
      `https://solana-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
    );

    const fromPubkey = provider.publicKey;
    const toPubkey = new PublicKey(args.address);

    // Native SOL transfer
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
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
        },
      );

      // Don't wait for confirmation - just return the signature
      // The 1Click API will handle monitoring the transaction
      return { hash: signature };
    }

    // SPL token transfer
    const { getAssociatedTokenAddress, createTransferInstruction } =
      await import('@solana/spl-token');

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

    const transaction = new Transaction().add(
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
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      {
        skipPreflight: false,
        maxRetries: 3,
      },
    );

    // Don't wait for confirmation - just return the signature
    // The 1Click API will handle monitoring the transaction
    return { hash: signature };
  };

  return { make };
};
