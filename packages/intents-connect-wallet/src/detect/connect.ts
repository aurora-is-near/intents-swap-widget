import { NEAR_NETWORK } from '@/detect/near';
import {
  forgetWalletConnection,
  rememberWalletConnection,
} from '@/detect/remembered';
import type { ConnectOptions, DetectedWallet } from '@/detect/types';
import { isPluggableWallet } from '@/detect/pluggable';
import { callWallet } from '@/detect/withTimeout';

type ConnectFeature = { connect: () => Promise<unknown> };
type DisconnectFeature = { disconnect: () => Promise<void> };

/** The caller's reason, or a plain cancellation (named `AbortError`). */
const abortReason = (signal: AbortSignal): Error =>
  signal.reason instanceof Error && signal.reason.name !== 'AbortError'
    ? signal.reason
    : Object.assign(new Error('The connection was cancelled'), {
        name: 'AbortError',
      });

/**
 * `promise`, or a rejection as soon as `signal` aborts. A wallet's prompt
 * can't always be withdrawn, but nothing has to keep waiting on it.
 */
const unlessAborted = <T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T> => {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    return Promise.reject(abortReason(signal));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortReason(signal));

    signal.addEventListener('abort', onAbort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
};

const askWallet = async (wallet: DetectedWallet): Promise<void> => {
  switch (wallet.family) {
    case 'evm':
      await wallet.provider.request({ method: 'eth_requestAccounts' });
      break;

    case 'sol':
      await (
        wallet.wallet.features['standard:connect'] as ConnectFeature
      ).connect();
      break;

    case 'near': {
      const { signIn } = wallet.wallet;

      if (!signIn) {
        throw new Error(`${wallet.name} cannot be connected from this page`);
      }

      await signIn.call(wallet.wallet, { network: NEAR_NETWORK });
      break;
    }

    default:
      break;
  }
};

/**
 * Asks a detected wallet to share an account with this site, through the
 * wallet's own prompt — the one place this package prompts. Call it from a
 * user gesture, then `refresh()` the detector to pick the account up.
 *
 * The wallet is remembered: later detections restore it silently.
 *
 * `signal` calls the attempt off: the promise rejects at once, and a late
 * answer from the wallet is neither waited for nor remembered.
 */
export const connectDetectedWallet = async (
  wallet: DetectedWallet,
  { signal }: ConnectOptions = {},
): Promise<void> => {
  await unlessAborted(
    isPluggableWallet(wallet) ? wallet.connect({ signal }) : askWallet(wallet),
    signal,
  );
  rememberWalletConnection(wallet.id);
};

/**
 * Stops using a wallet on this site: it is no longer restored or picked by
 * `pickConnectedWallet`, even where the wallet itself keeps sharing an
 * account. Also asks the wallet to revoke the connection, where it can —
 * best effort, never throws.
 */
export const disconnectDetectedWallet = async (
  wallet: DetectedWallet,
): Promise<void> => {
  forgetWalletConnection(wallet.id);

  if (isPluggableWallet(wallet)) {
    await callWallet(() => wallet.disconnect()).catch(() => undefined);

    return;
  }

  await callWallet(async () => {
    switch (wallet.family) {
      case 'evm':
        await wallet.provider.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
        break;

      case 'sol':
        await (
          wallet.wallet.features['standard:disconnect'] as
            | DisconnectFeature
            | undefined
        )?.disconnect();
        break;

      case 'near':
        await wallet.wallet.signOut?.call(wallet.wallet, {
          network: NEAR_NETWORK,
        });
        break;

      default:
        break;
    }
  }).catch(() => undefined);
};
