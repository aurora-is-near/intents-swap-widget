import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  rpc,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import {
  type MakeTransfer,
  type MakeTransferArgs,
  resolveTransferAmount,
  type TransferResult,
} from '@aurora-is-near/intents-connect';

import { RPC_ENDPOINTS, USDC_ASSET } from '@/stellar/constants';
import { createMemo } from '@/stellar/createMemo';
import type { StellarTransferOptions } from '@/stellar/types';

/** Atomic units → the decimal string the SDK's payment op expects. */
const toDecimalAmount = (atomic: bigint, decimals: number): string => {
  // Stellar classic amounts carry at most 7 decimal places; a finer-grained
  // atomic amount cannot be represented losslessly in a payment op.
  if (decimals > 7) {
    throw new Error(
      `Stellar payments support at most 7 decimals, got ${decimals}`,
    );
  }

  const perUnit = 10n ** BigInt(decimals);
  const whole = atomic / perUnit;
  const fraction = (atomic % perUnit).toString().padStart(decimals, '0');

  return fraction
    ? `${whole}.${fraction}`.replace(/\.?0+$/, '')
    : whole.toString();
};

/**
 * Resolves the asset to pay with. Absent means native XLM; anything present
 * must resolve to a KNOWN issued asset — falling through to native for an
 * unrecognized token would irreversibly send XLM in place of the token.
 */
const resolveAsset = (tokenAddress?: string): Asset => {
  if (!tokenAddress) {
    return Asset.native();
  }

  if (tokenAddress === USDC_ASSET.issuer) {
    return USDC_ASSET;
  }

  // `CODE:ISSUER` form.
  const [code, issuer] = tokenAddress.split(':');

  if (code && issuer && /^G[A-Z2-7]{55}$/.test(issuer)) {
    return new Asset(code, issuer);
  }

  throw new Error(`Unsupported Stellar token address: ${tokenAddress}`);
};

const INCLUSION_POLL_ATTEMPTS = 15;
const INCLUSION_POLL_INTERVAL_MS = 2_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Waits for the submitted transaction to be included in a ledger.
 *
 * `sendTransaction` only queues the transaction; a PENDING hash says nothing
 * about the payment landing. Returning it unconfirmed would let the runner
 * record a deposit that may fail on-chain (missing trustline, bad sequence)
 * with no error ever surfaced.
 */
const waitForInclusion = async (rpcServer: rpc.Server, hash: string) => {
  for (let attempt = 0; attempt < INCLUSION_POLL_ATTEMPTS; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result = await rpcServer.getTransaction(hash);

    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return;
    }

    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(
        `Stellar transaction ${hash} failed on-chain: ${String(result.resultXdr ?? 'unknown result')}`,
      );
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(INCLUSION_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Stellar transaction ${hash} was not confirmed within ${INCLUSION_POLL_ATTEMPTS} polls`,
  );
};

/**
 * Sends the origin-chain deposit for a Stellar origin.
 *
 * Ported from `@aurora-is-near/intents-swap-widget-stellar` with its RPC
 * failover, memo handling and the two-arity `signTransaction` fallback intact.
 */
export const makeTransfer: MakeTransfer<StellarTransferOptions> = async (
  args: MakeTransferArgs,
  options: StellarTransferOptions,
): Promise<Pick<TransferResult, 'hash'>> => {
  const provider = options?.provider;
  const rpcEndpoints = options?.rpcEndpoints ?? RPC_ENDPOINTS;

  if (!provider) {
    throw new Error(
      'Stellar transfer requires pluginOptions.provider (a StellarProvider)',
    );
  }

  if (!provider.publicKey) {
    throw new Error('No public key found in Stellar provider.');
  }

  if (!args.memo) {
    throw new Error('No memo provided.');
  }

  // 1. Resolve an RPC that can load the source account, trying each in turn.
  let rpcServer: rpc.Server | null = null;
  let sourceAccount = null;

  // eslint-disable-next-line no-restricted-syntax
  for (const url of rpcEndpoints) {
    try {
      const tempServer = new rpc.Server(url);

      // eslint-disable-next-line no-await-in-loop
      sourceAccount = await tempServer.getAccount(provider.publicKey);
      rpcServer = tempServer;
      break;
    } catch {
      // Try the next endpoint.
    }
  }

  if (!rpcServer || !sourceAccount) {
    throw new Error('Could not connect to Stellar RPC to load account data.');
  }

  const txAmount = toDecimalAmount(
    resolveTransferAmount(args),
    args.decimals ?? 7,
  );

  // 2. Payment operation.
  const paymentOp = Operation.payment({
    destination: args.address,
    asset: resolveAsset(args.tokenAddress),
    amount: txAmount,
  });

  // 3. Transaction, carrying the memo.
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.PUBLIC,
    memo: createMemo(args.memo),
  })
    .addOperation(paymentOp)
    .setTimeout(30)
    .build();

  // 4. Signature. Wallets Kit takes two arguments; Freighter's direct API takes
  //    one, so fall back on an arity complaint rather than failing outright.
  let signedTxXdr: string;

  try {
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

    if (!isUnsupportedArity) {
      throw err;
    }

    const result = await provider.signTransaction(transaction.toXDR());

    signedTxXdr = typeof result === 'string' ? result : result.signedTxXdr;
  }

  if (!signedTxXdr) {
    throw new Error('Transaction signing failed.');
  }

  // 5. Submit the signed XDR.
  const signedTx = TransactionBuilder.fromXDR(
    signedTxXdr,
    Networks.PUBLIC,
  ) as Transaction;

  const submitResult = await rpcServer.sendTransaction(signedTx);

  if (
    submitResult.status === 'ERROR' ||
    submitResult.status === 'TRY_AGAIN_LATER'
  ) {
    throw new Error(
      `Stellar transaction failed to submit with status ${submitResult.status}. Hash: ${submitResult.hash}`,
    );
  }

  // 6. Only a ledger-included payment is a deposit.
  await waitForInclusion(rpcServer, submitResult.hash);

  return { hash: submitResult.hash };
};
