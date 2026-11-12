/**
 * TronLink rejects `signMessageV2` and `trx.sign` with a bare string
 * ("Confirmation declined by user"), not an Error and with no code. Turned
 * into an Error carrying EIP-1193's 4001, so every rejection check sees it.
 */
const toTronWalletError = (error: unknown): unknown => {
  if (typeof error !== 'string') {
    return error;
  }

  return Object.assign(new Error(error), {
    ...(/declined|rejected|denied|cancel/i.test(error) ? { code: 4001 } : {}),
  });
};

/** Calls the wallet, rethrowing a bare-string failure as an Error. */
export const callTronWallet = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    throw toTronWalletError(error);
  }
};
