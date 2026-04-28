export const mockConnectedWalletAddress = (
  type: 'evm' | 'near' | 'sol' | 'tron',
) => {
  if (type === 'sol') {
    return '7xKXtg2CW87d8V6zXKBq7cM8Y2FPHwzaAkxqEqD7x4rH';
  }

  if (type === 'near') {
    return 'test-account.near';
  }

  if (type === 'tron') {
    return 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
  }

  return '0x1234567890123456789012345678901234567890';
};
