import {
  Asset,
  BASE_FEE,
  Memo,
  Networks,
  Operation,
  rpc,
  StrKey,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import type { MakeTransferArgs, Providers } from '../types';

import { isStellarAddress } from '@/utils/chains/isStellarAddress';
import { TransferError } from '@/errors';

const RPC_URLS = [
  'https://rpc.ankr.com/stellar_soroban',
  'https://stellar-soroban-public.nodies.app',
  'https://sorobanrpc.stellar.org',
];

const USDC_ASSET = new Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
);

const createMemo = (memoString: string): Memo => {
  if (!memoString) {
    return Memo.none();
  }

  // 1. If it's a numeric ID
  if (/^\d+$/.test(memoString)) {
    return Memo.id(memoString);
  }

  // 2. If it's a standard text memo (28 chars or less)
  if (Buffer.from(memoString).length <= 28) {
    return Memo.text(memoString);
  }

  // 3. If the memo is a lowercase Stellar public key (56 chars starting with g)
  // We must convert it back to uppercase to decode it, then use the 32-byte raw public key as a MemoHash
  if (/^g[0-7a-z]{55}$/.test(memoString)) {
    const rawPublicKeyBytes = StrKey.decodeEd25519PublicKey(
      memoString.toUpperCase(),
    );

    return Memo.hash(rawPublicKeyBytes);
  }

  // 4. If the memo is a 64-character hex string
  if (/^[0-9a-fA-F]{64}$/.test(memoString)) {
    return Memo.hash(memoString);
  }

  throw new TransferError({
    code: 'TRANSFER_INVALID_INITIAL',
    meta: { message: `Unsupported Stellar memo format: ${memoString}` },
  });
};

export const useMakeStellarTransfer = ({
  provider,
}: {
  provider?: Providers['stellar'];
}) => {
  const make = async ({
    memo,
    amount,
    tokenAddress,
    address: toAddress,
  }: MakeTransferArgs & { memo: string }) => {
    if (!provider) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No Stellar provider found.' },
      });
    }

    if (!isStellarAddress(toAddress)) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: `Invalid Stellar destination address: ${toAddress}` },
      });
    }

    if (!provider.publicKey) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No public key found in Stellar provider.' },
      });
    }

    if (!memo) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No memo provided.' },
      });
    }

    // 1. Init RPC Server with failover logic
    let rpcServer: rpc.Server | null = null;
    let sourceAccount = null;

    // eslint-disable-next-line no-restricted-syntax
    for (const url of RPC_URLS) {
      try {
        const tempServer = new rpc.Server(url);

        // eslint-disable-next-line no-await-in-loop
        sourceAccount = await tempServer.getAccount(provider.publicKey);
        rpcServer = tempServer;
        break;
      } catch (e) {
        // just continue on error
      }
    }

    if (!rpcServer || !sourceAccount) {
      throw new Error('Could not connect to Stellar RPC to load account data.');
    }

    const rawAmount = BigInt(amount);
    const whole = rawAmount / 10_000_000n;
    const fraction = (rawAmount % 10_000_000n).toString().padStart(7, '0');
    const txAmount = `${whole}.${fraction}`.replace(/\.?0+$/, '');

    // 2. Build the payment operation
    const paymentOp =
      tokenAddress === USDC_ASSET.issuer
        ? Operation.payment({
            destination: toAddress,
            asset: USDC_ASSET,
            amount: txAmount,
          })
        : Operation.payment({
            destination: toAddress,
            asset: Asset.native(),
            amount: txAmount,
          });

    // 3. Build Transaction
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.PUBLIC,
      memo: createMemo(memo),
    })
      .addOperation(paymentOp)
      .setTimeout(30)
      .build();

    // 4. Request Signature from Wallet
    let signedTxXdr: string;

    try {
      // Try the standard Wallets Kit signature (2 arguments)
      const result = await provider.signTransaction(transaction.toXDR(), {
        networkPassphrase: Networks.PUBLIC,
        address: provider.publicKey,
      });

      signedTxXdr = typeof result === 'string' ? result : result.signedTxXdr;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';

      const combined = `${msg} ${code}`.toLowerCase();

      const isUnsupportedArity =
        combined.includes('unsupported') ||
        combined.includes('arity') ||
        combined.includes('number of arguments') ||
        combined.includes('arguments');

      if (isUnsupportedArity) {
        // Fallback: provider strictly expects 1 argument (e.g. Freighter direct API)
        const result = await provider.signTransaction(transaction.toXDR());

        signedTxXdr = typeof result === 'string' ? result : result.signedTxXdr;
      } else {
        throw err;
      }
    }

    if (!signedTxXdr) {
      throw new Error('Transaction signing failed.');
    }

    // 5. Reconstruct signed transaction from XDR
    const signedTx = TransactionBuilder.fromXDR(
      signedTxXdr,
      Networks.PUBLIC,
    ) as Transaction;

    // 6. Submit Transaction to RPC
    const submitResult = await rpcServer.sendTransaction(signedTx);

    if (submitResult.status === 'ERROR') {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: {
          message: `Stellar transaction failed to submit. Hash: ${submitResult.hash}`,
        },
      });
    }

    return {
      hash: submitResult.hash,
      transactionLink: `https://stellar.expert/explorer/public/tx/${submitResult.hash}`,
    };
  };

  return { make };
};
