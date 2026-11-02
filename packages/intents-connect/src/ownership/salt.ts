import { hex } from '@scure/base';

import { type NearRpcOptions, viewCall } from '@/near/rpc';

export const INTENTS_CONTRACT = 'intents.near';

/**
 * Short on purpose: a nonce salted with a rotated-out salt is rejected, and a
 * rejection costs the user another wallet prompt. The intents-sdk caches for 5
 * minutes; one minute keeps the window small for a call that is cheap.
 */
const SALT_TTL_MS = 60_000;

let cache: { salt: Uint8Array; fetchedAt: number } | undefined;
let inFlight: Promise<Uint8Array> | undefined;

/** Drops the cached salt, e.g. after `intents.near` rejected a nonce. */
export const invalidateSalt = () => {
  cache = undefined;
};

/**
 * `intents.near`'s `current_salt`: 4 bytes every versioned nonce must embed.
 * Cached briefly and single-flight, so concurrent proofs share one RPC call.
 */
export const getCurrentSalt = async (
  options: NearRpcOptions & { now?: () => number } = {},
): Promise<Uint8Array> => {
  const { now = Date.now, ...rpc } = options;

  if (cache && now() - cache.fetchedAt < SALT_TTL_MS) {
    return cache.salt;
  }

  inFlight ??= viewCall<string>({
    ...rpc,
    contractId: INTENTS_CONTRACT,
    methodName: 'current_salt',
    args: {},
  })
    .then((value) => {
      const salt = hex.decode(value.replace(/^0x/, ''));

      if (salt.length !== 4) {
        throw new Error(`unexpected current_salt length: ${value}`);
      }

      cache = { salt, fetchedAt: now() };

      return salt;
    })
    .finally(() => {
      inFlight = undefined;
    });

  return inFlight;
};
