export const getRecipientErrorFromJson = (error: string) => {
  if (!error.includes('default_fee.recipient:')) {
    return undefined;
  }

  const recipientError = error.split('default_fee.recipient:').at(-1)?.trim();

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return recipientError || 'Invalid recipient address';
};
