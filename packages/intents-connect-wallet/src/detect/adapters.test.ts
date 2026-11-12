// @vitest-environment node
// web3.js rejects jsdom's cross-realm Uint8Array; nothing here needs a DOM.
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { describe, expect, it, vi } from 'vitest';

import type { DetectedEvmWallet, StandardWalletLike } from '@/detect';
import { toEvmWalletConnector } from '@/evm';
import { toNearWalletConnector } from '@/near';
import {
  standardWalletToSolanaProvider,
  toSolanaWalletConnector,
} from '@/solana';

const EVM_ADDRESS = '0xca67c1bb3fd69857e5edaf6aa1c65371bf46a464';

const evm = (address: string | null): DetectedEvmWallet => ({
  id: 'evm:io.metamask',
  family: 'evm',
  name: 'MetaMask',
  address,
  provider: { request: vi.fn(async () => '0x2105') },
});

describe('toEvmWalletConnector', () => {
  it('refuses a wallet that shares no account', () => {
    expect(toEvmWalletConnector(evm(null))).toEqual({
      connector: null,
      unsupportedReason: 'NOT_CONNECTED',
    });
  });

  it('builds an erc191 connector without the network guard by default', () => {
    const detected = evm(EVM_ADDRESS);
    const { connector } = toEvmWalletConnector(detected);

    expect(connector).toMatchObject({
      id: 'evm:io.metamask',
      signingStandard: 'erc191',
    });
    expect(connector?.getAddress()).toBe(EVM_ADDRESS);
    expect(connector?.getProviders()).toEqual({ evm: detected.provider });
    expect(connector?.getChainId).toBeUndefined();
    expect(connector?.chains).toContain('base');
  });

  it('reports the chain id when the network guard is on', async () => {
    const { connector } = toEvmWalletConnector(evm(EVM_ADDRESS), {
      networkGuard: true,
    });

    await expect(connector?.getChainId?.()).resolves.toBe(8453);
  });
});

const standardWallet = (address: string) => {
  const signMessage = vi.fn(async () => [
    { signature: new Uint8Array(64).fill(1) },
  ]);

  const signTransaction = vi.fn(
    async ({ transaction }: { transaction: Uint8Array }) => [
      { signedTransaction: transaction },
    ],
  );

  const connect = vi.fn(async () => ({ accounts: [{ address }] }));
  const wallet: StandardWalletLike = {
    name: 'Phantom',
    icon: '',
    chains: ['solana:mainnet'],
    accounts: [{ address }],
    features: {
      'standard:connect': { connect },
      'solana:signMessage': { signMessage },
      'solana:signTransaction': { signTransaction },
    },
  };

  return { wallet, signMessage, signTransaction, connect };
};

describe('Solana adapters', () => {
  const address = Keypair.generate().publicKey.toBase58();

  it('signs messages with the pinned account', async () => {
    const { wallet, signMessage } = standardWallet(address);
    const provider = standardWalletToSolanaProvider(wallet, address);

    await expect(provider.signMessage(new Uint8Array([1]))).resolves.toEqual(
      new Uint8Array(64).fill(1),
    );
    expect(signMessage).toHaveBeenCalledWith({
      account: { address },
      message: new Uint8Array([1]),
    });
    expect(provider.publicKey?.toString()).toBe(address);
  });

  it('round-trips a legacy transaction as the same web3.js class', async () => {
    const { wallet, signTransaction } = standardWallet(address);
    const provider = standardWalletToSolanaProvider(wallet, address);
    const transaction = new Transaction({
      feePayer: new PublicKey(address),
      recentBlockhash: '11111111111111111111111111111111',
    }).add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(address),
        toPubkey: Keypair.generate().publicKey,
        lamports: 1,
      }),
    );

    const signed = await provider.signTransaction(transaction);

    expect(signed).toBeInstanceOf(Transaction);
    expect(signTransaction.mock.calls[0]![0]).toMatchObject({
      chain: 'solana:mainnet',
    });
  });

  it('fails loudly when the wallet switched away from the pinned account', async () => {
    const { wallet } = standardWallet(Keypair.generate().publicKey.toBase58());
    const provider = standardWalletToSolanaProvider(wallet, address);

    await expect(provider.signMessage(new Uint8Array([1]))).rejects.toThrow(
      /no longer connected/,
    );
  });

  it('reconnects silently when the wallet dropped its accounts', async () => {
    const { wallet, connect } = standardWallet(address);
    const provider = standardWalletToSolanaProvider(
      { ...wallet, accounts: [] },
      address,
    );

    await provider.signMessage(new Uint8Array([1]));

    expect(connect).toHaveBeenCalledWith({ silent: true });
  });

  it('builds a raw_ed25519 connector', () => {
    const { wallet } = standardWallet(address);
    const { connector } = toSolanaWalletConnector({
      id: 'sol:Phantom',
      name: 'Phantom',
      address,
      wallet,
    });

    expect(connector).toMatchObject({
      signingStandard: 'raw_ed25519',
      chains: ['sol'],
    });
    expect(connector?.getPublicKey?.()).toBe(`ed25519:${address}`);
    expect(
      toSolanaWalletConnector({ id: 's', name: 's', address: null, wallet })
        .unsupportedReason,
    ).toBe('NOT_CONNECTED');
  });
});

describe('toNearWalletConnector', () => {
  const injected = () => ({
    manifest: { id: 'hot', name: 'HOT' },
    getAccounts: vi.fn(),
    signMessage: vi.fn(async () => ({
      accountId: 'alice.near',
      publicKey: 'ed25519:Key',
      signature: new Uint8Array([1, 2, 3]),
    })),
    signAndSendTransactions: vi.fn(async () => [
      { transaction: { hash: 'h' } },
    ]),
  });

  it('builds a nep413 connector whose signer normalises byte signatures', async () => {
    const wallet = injected();
    const { connector } = toNearWalletConnector({
      id: 'near:hot',
      family: 'near',
      name: 'HOT',
      address: 'alice.near',
      publicKey: 'ed25519:Key',
      wallet,
    });

    expect(connector).toMatchObject({
      signingStandard: 'nep413',
      chains: ['near'],
    });
    expect(connector?.getPublicKey?.()).toBe('ed25519:Key');

    const signer = connector!.getProviders().near!();
    const signed = await signer.signMessage!({
      message: 'm',
      recipient: 'intents.near',
      nonce: new Uint8Array(32),
    });

    expect(signed).toEqual({
      accountId: 'alice.near',
      publicKey: 'ed25519:Key',
      signature: 'AQID',
    });
    expect(wallet.signMessage).toHaveBeenCalledWith(
      expect.objectContaining({ network: 'mainnet' }),
    );
  });

  it('refuses a NEAR wallet without a public key', () => {
    expect(
      toNearWalletConnector({
        id: 'near:hot',
        family: 'near',
        name: 'HOT',
        address: 'alice.near',
        wallet: injected(),
      }).unsupportedReason,
    ).toBe('MISSING_PUBLIC_KEY');
  });

  it('accepts ./connect/near connector state', () => {
    const near = { signMessage: vi.fn() };
    const { connector } = toNearWalletConnector({
      id: 'near',
      isConnected: true,
      address: 'bob.near',
      connect: vi.fn(),
      disconnect: vi.fn(),
      signingStandard: 'nep413',
      getPublicKey: () => 'ed25519:Bob',
      getProviders: () => ({ near: () => near }),
      wallet: { signAndSendTransactions: vi.fn() },
    });

    expect(connector?.getAddress()).toBe('bob.near');
    expect(connector?.getPublicKey?.()).toBe('ed25519:Bob');
    expect(connector?.makeTransfer).toBeTypeOf('function');
  });
});
