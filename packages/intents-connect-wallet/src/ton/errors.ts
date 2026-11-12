import { UserRejectsError } from '@tonconnect/sdk';

/**
 * A wallet's refusal as EIP-1193's 4001, so every rejection check sees it:
 * TON Connect's own messages change with minification, its class doesn't.
 */
export const toTonWalletError = (error: unknown): unknown =>
  error instanceof UserRejectsError
    ? Object.assign(new Error('User rejected the request in the wallet'), {
        code: 4001,
        cause: error,
      })
    : error;

export const callTonWallet = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    throw toTonWalletError(error);
  }
};
