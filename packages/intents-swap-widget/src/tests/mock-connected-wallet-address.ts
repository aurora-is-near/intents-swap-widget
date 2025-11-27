export const mockConnectedWalletAddress = (type: 'evm' | 'near' | 'sol') => {
  if (type === 'sol') {
    return '7xKXtg2CW87d8V6zXKBq7cM8Y2FPHwzaAkxqEqD7x4rH';
  }

  if (type === 'near') {
    return 'test-account.near';
  }

  return '0x0000000000000000000000000000000000000000';
};
