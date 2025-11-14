import type { MakeTransferArgs, Providers } from '../types';

export const useMakeSolanaTransfer = ({
  provider,
  alchemyApiKey,
}: {
  provider?: Providers['sol'];
  alchemyApiKey?: string;
}) => {
  const make = async (args: MakeTransferArgs) => {
    if (!provider) {
      throw new Error('No Solana provider found.');
    }

    if (!alchemyApiKey) {
      throw new Error('An Alchemy API key is required for Solana transfers.');
    }

    const { Connection, PublicKey, SystemProgram, Transaction } = await import(
      '@solana/web3.js'
    );

    const connection = new Connection(
      `https://solana-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
    );

    const fromPubkey = provider.publicKey;

    if (!fromPubkey) {
      throw new Error('No public key found in Solana provider.');
    }

    const toPubkey = new PublicKey(args.address);

    if (!args.tokenAddress) {
      // Validate amount
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

    const { getAssociatedTokenAddress, createTransferInstruction } =
      await import('@solana/spl-token');

    // Validate amount
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
    const hash = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    return {
      hash,
      transactionLink: `https://solscan.io/tx/${hash}`,
    };
  };

  return { make };
};
