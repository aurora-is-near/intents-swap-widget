export const getRecipientErrorFromJson = (error: string) => {
  if (!error.includes('default_fee.recipient:')) {
    return undefined;
  }

  return (
    error.split('default_fee.recipient:').at(-1)?.trim() ??
    'Invalid recipient address'
  );
};
