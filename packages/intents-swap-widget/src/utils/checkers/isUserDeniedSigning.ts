import type { ErrorLikeObject } from '../isErrorLikeObject';

const errorVariations = [
  'user denied',
  'user closed',
  'user rejected',
  'user cancelled',
  'user declined',
];

export const isUserDeniedSigning = (error: ErrorLikeObject) => {
  return (
    errorVariations.some((variation) =>
      error.message.toLowerCase().includes(variation),
    ) ||
    errorVariations.some((variation) =>
      `${error.cause}`.toLowerCase().includes(variation),
    )
  );
};
