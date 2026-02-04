const ACCOUNT_ID_REGEX =
  /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

/**
 * Validates the Account ID according to the NEAR protocol Account ID rules.
 *
 * @see https://nomicon.io/DataStructures/Account#account-id-rules
 * @see https://github.com/near/near-sdk-js/blob/dc6f07bd30064da96efb7f90a6ecd8c4d9cc9b06/lib/utils.js#L107-L117
 */
export const isNearNamedAccount = (
  address: string | undefined | null,
): boolean => {
  if (!address) {
    return false;
  }

  return (
    address.length >= 2 &&
    address.length <= 64 &&
    ACCOUNT_ID_REGEX.test(address)
  );
};
