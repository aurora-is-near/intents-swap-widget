const errorVariations = [
  'user denied',
  'user closed',
  'user rejected',
  'user cancelled',
  'user declined',
];

export const isUserDeniedSigning = (errorMessage: string) => {
  return errorVariations.some((variation) =>
    errorMessage.toLowerCase().includes(variation),
  );
};
