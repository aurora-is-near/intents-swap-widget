import { keccak256 } from 'ethers';

export function nearAccountToEvmAddress(accountId: string): string {
  if (!accountId) {
    throw new Error('NEAR account ID is required');
  }

  const hash = keccak256(Buffer.from(accountId));
  return `0x${hash.slice(-40)}`;
}

export function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function normalizeEvmAddress(address: string): string {
  const normalized = address.toLowerCase();
  return normalized.startsWith('0x') ? normalized : `0x${normalized}`;
}

export function getEvmRecipient(recipient: string): string {
  if (isEvmAddress(recipient)) {
    return normalizeEvmAddress(recipient);
  }
  return nearAccountToEvmAddress(recipient);
}
