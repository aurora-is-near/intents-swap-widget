import { describe, expect, it, vi } from 'vitest';

import type {
  DetectedEvmWallet,
  DetectedNearWallet,
  DetectedSolanaWallet,
} from '@/detect';

const adapters = vi.hoisted(() => ({
  evm: vi.fn(() => ({ connector: null, unsupportedReason: 'evm' })),
  sol: vi.fn(() => ({ connector: null, unsupportedReason: 'sol' })),
  near: vi.fn(() => ({ connector: null, unsupportedReason: 'near' })),
}));

vi.mock('@/evm/toWalletConnector', () => ({
  toEvmWalletConnector: adapters.evm,
}));
vi.mock('@/solana/toWalletConnector', () => ({
  toSolanaWalletConnector: adapters.sol,
}));
vi.mock('@/near/toWalletConnector', () => ({
  toNearWalletConnector: adapters.near,
}));

const { toWalletConnector } = await import('@/detect/connector');

const evm = {
  id: 'evm:io.metamask',
  family: 'evm',
  name: 'MetaMask',
  address: '0xca67c1bb3fd69857e5edaf6aa1c65371bf46a464',
  provider: { request: vi.fn() },
} as DetectedEvmWallet;

const sol = {
  id: 'sol:Phantom',
  family: 'sol',
  name: 'Phantom',
  address: 'So11111111111111111111111111111111111111112',
} as DetectedSolanaWallet;

const near = {
  id: 'near:hot-wallet',
  family: 'near',
  name: 'HOT',
  address: 'alice.near',
} as DetectedNearWallet;

describe('toWalletConnector', () => {
  it("hands each wallet to its family's adapter, with that family's options", () => {
    const options = {
      evm: { networkGuard: true },
      sol: { rpcUrl: 'https://solana.example' },
      near: { rpcUrls: ['https://near.example'] },
    };

    expect(toWalletConnector(evm, options).unsupportedReason).toBe('evm');
    expect(adapters.evm).toHaveBeenCalledWith(evm, options.evm);

    expect(toWalletConnector(sol, options).unsupportedReason).toBe('sol');
    expect(adapters.sol).toHaveBeenCalledWith(sol, options.sol);

    expect(toWalletConnector(near, options).unsupportedReason).toBe('near');
    expect(adapters.near).toHaveBeenCalledWith(near, options.near);
  });

  it('passes no options when none are given', () => {
    toWalletConnector(sol);

    expect(adapters.sol).toHaveBeenLastCalledWith(sol, undefined);
  });
});
