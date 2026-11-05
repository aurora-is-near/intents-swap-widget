import {
  type MakeTransfer,
  resolveTransferAmount,
  standards,
  type TransferResult,
} from '@aurora-is-near/intents-connect';
import { Address, beginCell, Cell, loadMessage, storeMessage } from '@ton/core';

import type { TonMessage, TonTransferOptions } from '@/ton/types';

const DEFAULT_TONCENTER = ['https://toncenter.com'];
/** How long the wallet may take to send it. */
const VALID_FOR_S = 300;
const JETTON_TRANSFER_OP = 0x0f8a7ea5;
/** TON attached to a jetton transfer for its fees; the excess comes back. */
const JETTON_TRANSFER_TON = 50_000_000n;
/** Forwarded with the jettons, so the recipient gets a transfer notification. */
const FORWARD_TON = 1n;
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_CONFIRMATION_TIMEOUT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 10_000;

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const toHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** A text comment, as TON wallets show it. */
const comment = (text: string) =>
  beginCell().storeUint(0, 32).storeStringTail(text).endCell();

const toncenter = async <T>(
  urls: readonly string[],
  path: string,
  apiKey: string | undefined,
): Promise<T> => {
  let lastError = 'no toncenter endpoint configured';

  // eslint-disable-next-line no-restricted-syntax
  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(`${url.replace(/\/$/, '')}/api/v3/${path}`, {
        headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
        signal: controller.signal,
      });

      if (response.ok) {
        // eslint-disable-next-line no-await-in-loop
        return (await response.json()) as T;
      }

      lastError = `${url} responded ${response.status}`;
    } catch (error) {
      lastError = `${url}: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`toncenter unavailable: ${lastError}`);
};

/**
 * TEP-467's normalized hash of an external-in message, which indexers key
 * it by: the same message with no source, no import fee, no init and the
 * body in a reference. Wallets may fill those in differently.
 */
export const normalizedMessageHash = (boc: string): string => {
  const cell = Cell.fromBase64(boc);
  const message = loadMessage(cell.beginParse());

  if (message.info.type !== 'external-in') {
    return toHex(cell.hash());
  }

  return toHex(
    beginCell()
      .store(
        storeMessage(
          {
            info: {
              type: 'external-in',
              src: null,
              dest: message.info.dest,
              importFee: 0n,
            },
            init: null,
            body: message.body,
          },
          { forceRef: true },
        ),
      )
      .endCell()
      .hash(),
  );
};

/** The sender's wallet for a jetton, whose transfer moves the jettons. */
const jettonWalletOf = async (
  owner: string,
  master: string,
  urls: readonly string[],
  apiKey: string | undefined,
): Promise<Address> => {
  const { jetton_wallets: wallets } = await toncenter<{
    jetton_wallets?: { address: string }[];
  }>(
    urls,
    `jetton/wallets?owner_address=${encodeURIComponent(owner)}&jetton_address=${encodeURIComponent(master)}&limit=1`,
    apiKey,
  );

  const wallet = wallets?.[0]?.address;

  if (!wallet) {
    throw new Error('This wallet holds none of that token on TON.');
  }

  return Address.parse(wallet);
};

/** A TEP-74 jetton transfer, sent to the sender's own jetton wallet. */
const jettonTransfer = async ({
  owner,
  master,
  recipient,
  amount,
  memo,
  urls,
  apiKey,
}: {
  owner: string;
  master: string;
  recipient: string;
  amount: bigint;
  memo?: Cell;
  urls: readonly string[];
  apiKey?: string;
}): Promise<TonMessage> => {
  const jettonWallet = await jettonWalletOf(owner, master, urls, apiKey);
  const body = beginCell()
    .storeUint(JETTON_TRANSFER_OP, 32)
    .storeUint(Date.now(), 64)
    .storeCoins(amount)
    .storeAddress(Address.parse(recipient))
    // The excess TON comes back here.
    .storeAddress(Address.parse(owner))
    .storeBit(false)
    .storeCoins(FORWARD_TON)
    .storeMaybeRef(memo ?? null)
    .endCell();

  return {
    address: jettonWallet.toString({ bounceable: true, urlSafe: true }),
    amount: JETTON_TRANSFER_TON.toString(),
    payload: body.toBoc().toString('base64'),
  };
};

/** The transaction the wallet's message landed in, as hex, once it has. */
const findTransaction = async (
  messageHash: string,
  urls: readonly string[],
  apiKey: string | undefined,
  pollIntervalMs: number,
  timeoutMs: number,
): Promise<string | undefined> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    const found = await toncenter<{ transactions?: { hash: string }[] }>(
      urls,
      `transactionsByMessage?msg_hash=${messageHash}&direction=in&limit=1`,
      apiKey,
    ).catch(() => undefined);

    const hash = found?.transactions?.[0]?.hash;

    if (hash) {
      return toHex(standards.fromBase64(hash));
    }

    // eslint-disable-next-line no-await-in-loop
    await delay(pollIntervalMs);
  }

  return undefined;
};

/**
 * Sends the deposit for a TON origin through the TON Connect session: TON to
 * the deposit address (non-bounceable, so it can't bounce off an account
 * that isn't deployed yet), or a jetton (USDT) through the sender's jetton
 * wallet, with 0.05 TON attached for fees.
 *
 * Returns the hash of the transaction the message landed in, found on
 * toncenter; if it isn't found in time, the message's normalized hash
 * (failing would offer the user a second transfer).
 */
export const makeTransfer: MakeTransfer<TonTransferOptions> = async (
  args,
  options,
): Promise<Pick<TransferResult, 'hash'>> => {
  const client = options?.client;

  if (!client) {
    throw new Error('TON transfer requires the TON Connect client');
  }

  const peer = client.currentPeer();

  if (!peer) {
    throw new Error('No TON wallet is connected.');
  }

  if (!peer.mainnet) {
    throw new Error(
      'The TON wallet is on the testnet. Switch it to mainnet and try again.',
    );
  }

  const urls = options.toncenterUrls ?? DEFAULT_TONCENTER;
  const apiKey = options.toncenterApiKey;
  const amount = resolveTransferAmount(args);
  const memo = args.memo ? comment(args.memo) : undefined;

  const message: TonMessage = args.tokenAddress
    ? await jettonTransfer({
        owner: peer.address,
        master: args.tokenAddress,
        recipient: args.address,
        amount,
        memo,
        urls,
        apiKey,
      })
    : {
        address: Address.parse(args.address).toString({
          bounceable: false,
          urlSafe: true,
        }),
        amount: amount.toString(),
        payload: memo?.toBoc().toString('base64'),
      };

  const { boc } = await client.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + VALID_FOR_S,
    messages: [message],
  });

  const messageHash = normalizedMessageHash(boc);
  const transaction = await findTransaction(
    messageHash,
    urls,
    apiKey,
    options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    options.confirmationTimeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_MS,
  );

  return { hash: transaction ?? messageHash };
};
