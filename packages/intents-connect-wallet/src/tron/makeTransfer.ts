import {
  type MakeTransfer,
  type MakeTransferArgs,
  resolveTransferAmount,
  type TransferResult,
} from '@aurora-is-near/intents-connect';

import { callTronWallet } from '@/tron/errors';
import type {
  TronBroadcast,
  TronTransaction,
  TronTransactionInfo,
  TronTransferOptions,
  TronWebLike,
} from '@/tron/types';

/** Mainnet's chain id is the tail of its genesis block id. */
const MAINNET_GENESIS_TAIL = '2b6653dc';
/**
 * The most a TRC-20 transfer may burn for energy, in sun (100 TRX). Only what
 * the call uses is burned: a USDT transfer to a fresh address takes about
 * 130k energy.
 */
const FEE_LIMIT = 100_000_000;
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_INCLUSION_TIMEOUT_MS = 90_000;

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * A token contract as TronWeb takes it: base58 (`T…`) as is, and the bare
 * 20-byte hex an `*.omft.near` asset id carries with its `41` prefix.
 */
export const toTronContract = (tokenAddress: string): string =>
  /^[0-9a-f]{40}$/i.test(tokenAddress) ? `41${tokenAddress}` : tokenAddress;

const toSun = (amount: bigint): number => {
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('TRX amount is too large to send');
  }

  return Number(amount);
};

/** TRON's broadcast errors are often hex-encoded text. */
const readMessage = ({ code, message }: TronBroadcast): string => {
  const text =
    message && /^[0-9a-f]+$/i.test(message) && message.length % 2 === 0
      ? new TextDecoder().decode(
          Uint8Array.from(message.match(/../g) ?? [], (byte) =>
            Number.parseInt(byte, 16),
          ),
        )
      : message;

  return [code, text].filter(Boolean).join(': ') || 'unknown error';
};

const assertMainnet = async (tronWeb: TronWebLike) => {
  const genesis = await tronWeb.trx.getBlockByNumber?.(0).catch(() => null);

  if (genesis?.blockID && !genesis.blockID.endsWith(MAINNET_GENESIS_TAIL)) {
    throw new Error(
      'The TRON wallet is on a test network. Switch it to TRON Mainnet and try again.',
    );
  }
};

const buildTransaction = async (
  tronWeb: TronWebLike,
  args: MakeTransferArgs,
  from: string,
): Promise<TronTransaction> => {
  const amount = resolveTransferAmount(args);

  if (!args.tokenAddress) {
    return tronWeb.transactionBuilder.sendTrx(
      args.address,
      toSun(amount),
      from,
    );
  }

  const built = await tronWeb.transactionBuilder.triggerSmartContract(
    toTronContract(args.tokenAddress),
    'transfer(address,uint256)',
    { feeLimit: FEE_LIMIT, callValue: 0 },
    [
      { type: 'address', value: args.address },
      { type: 'uint256', value: amount.toString() },
    ],
    from,
  );

  if (!built.result?.result || !built.transaction) {
    throw new Error(
      `Could not build the TRC-20 transfer: ${built.result?.message ?? 'no transaction'}`,
    );
  }

  return built.transaction;
};

/**
 * Waits until the transaction is in a block, and fails if the chain says it
 * failed (a TRC-20 call out of energy, or reverted). If it isn't seen in
 * time, the hash is returned anyway: it was broadcast, and failing here would
 * offer the user a second transfer.
 */
const waitForInclusion = async (
  tronWeb: TronWebLike,
  txid: string,
  pollIntervalMs: number,
  timeoutMs: number,
) => {
  const read = tronWeb.trx.getUnconfirmedTransactionInfo
    ? (id: string) => tronWeb.trx.getUnconfirmedTransactionInfo!(id)
    : (id: string) => tronWeb.trx.getTransactionInfo(id);

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    const info: TronTransactionInfo | null = await read(txid).catch(() => null);

    if (info?.blockNumber) {
      const outcome = info.receipt?.result;

      if (info.result === 'FAILED' || (outcome && outcome !== 'SUCCESS')) {
        throw new Error(
          `The TRON transfer failed on chain (${outcome ?? info.result}). No tokens were sent.`,
        );
      }

      return;
    }

    // eslint-disable-next-line no-await-in-loop
    await delay(pollIntervalMs);
  }
};

/**
 * Sends the deposit for a TRON origin with the wallet's own TronWeb: TRX with
 * `sendTrx`, a TRC-20 (USDT) with `transfer(address,uint256)`. The wallet
 * signs (`trx.sign`), then it's broadcast and followed into a block.
 *
 * TRON deposits carry no memo: a memo here means the execution expects
 * something this transfer can't do, so it refuses rather than lose the funds.
 */
export const makeTransfer: MakeTransfer<TronTransferOptions> = async (
  args,
  options,
): Promise<Pick<TransferResult, 'hash'>> => {
  const tronWeb = options?.tronWeb;

  if (!tronWeb) {
    throw new Error('TRON transfer requires the wallet’s tronWeb');
  }

  if (args.memo) {
    throw new Error('TRON deposits take no memo; this one asked for one.');
  }

  const from = options.address ?? tronWeb.defaultAddress?.base58;

  if (!from) {
    throw new Error('The TRON wallet shares no account with this site.');
  }

  await assertMainnet(tronWeb);

  const unsigned = await buildTransaction(tronWeb, args, from);
  const signed = await callTronWallet(() => tronWeb.trx.sign(unsigned));
  const broadcast = await tronWeb.trx.sendRawTransaction(signed);

  if (!broadcast.result) {
    throw new Error(`TRON refused the transfer: ${readMessage(broadcast)}`);
  }

  const txid = broadcast.txid ?? signed.txID;

  await waitForInclusion(
    tronWeb,
    txid,
    options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    options.inclusionTimeoutMs ?? DEFAULT_INCLUSION_TIMEOUT_MS,
  );

  return { hash: txid };
};
