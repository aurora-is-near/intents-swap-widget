export const isValidBigint = (value: string) => {
  try {
    BigInt(value);

    return true;
  } catch (e) {
    return false;
  }
};
