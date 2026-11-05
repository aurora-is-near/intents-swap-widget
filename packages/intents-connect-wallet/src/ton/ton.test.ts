// @vitest-environment node
import { isUserRejection } from '@aurora-is-near/intents-connect';
import { Address, beginCell, Cell, storeMessage } from '@ton/core';
import { CHAIN, UserRejectsError, type Wallet } from '@tonconnect/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTonConnectClient, type TonConnectLike } from '@/ton/client';
import { makeTransfer, normalizedMessageHash } from '@/ton/makeTransfer';
import { toTonWalletConnector } from '@/ton/toWalletConnector';

const RAW =
  '0:4dae3b05729bcdbb92d95ae4ee6108900b455e8813a6a20140ceb3fb0093a75a';

const FRIENDLY = Address.parseRaw(RAW).toString({
  bounceable: false,
  urlSafe: true,
});

const PUBLIC_KEY_HEX = `${'00'.repeat(31)}01`;
const DEPOSIT_BOUNCEABLE = Address.parseRaw(`0:${'ab'.repeat(32)}`).toString({
  bounceable: true,
  urlSafe: true,
});

const USDT_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const JETTON_WALLET_RAW = `0:${'cd'.repeat(32)}`;

const tonkeeper = (overrides: Partial<Wallet['device']> = {}): Wallet => ({
  provider: 'injected',
  device: {
    platform: 'browser',
    appName: 'tonkeeper',
    appVersion: '4',
    maxProtocolVersion: 2,
    features: [
      'SendTransaction',
      { name: 'SignData', types: ['text', 'binary', 'cell'] },
    ],
    ...overrides,
  },
  account: {
    address: RAW,
    chain: CHAIN.MAINNET,
    walletStateInit: '',
    publicKey: PUBLIC_KEY_HEX,
  },
});

/** A TonConnect stand-in: the test drives its status changes. */
const fakeTonConnect = () => {
  let status: (wallet: Wallet | null) => void = () => undefined;
  let errors: (error: never) => void = () => undefined;
  const stub = {
    connected: false,
    wallet: null as Wallet | null,
    getWallets: vi.fn(async () => [
      {
        name: 'Tonkeeper',
        appName: 'tonkeeper',
        imageUrl: 'https://icons.test/tonkeeper.png',
        aboutUrl: '',
        platforms: ['chrome'],
        jsBridgeKey: 'tonkeeper',
        injected: true,
        embedded: false,
        universalLink: 'https://app.tonkeeper.com/ton-connect',
        bridgeUrl: 'https://bridge.tonapi.io/bridge',
      },
      {
        name: 'MyTonWallet',
        appName: 'mytonwallet',
        imageUrl: '',
        aboutUrl: '',
        platforms: ['ios'],
        universalLink: 'https://connect.mytonwallet.org',
        bridgeUrl: 'https://tonconnectbridge.mytonwallet.org/bridge',
      },
      {
        name: 'Other',
        appName: 'other',
        imageUrl: '',
        aboutUrl: '',
        platforms: ['ios'],
        universalLink: 'https://other.test',
        bridgeUrl: 'https://bridge.tonapi.io/bridge',
      },
    ]),
    onStatusChange: vi.fn((onStatus, onError) => {
      status = onStatus;
      errors = onError;

      return () => undefined;
    }),
    connect: vi.fn((_source: unknown, _options?: unknown) => 'tc://?v=2&id=1'),
    restoreConnection: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => {
      stub.connected = false;
      stub.wallet = null;
      status(null);
    }),
    signData: vi.fn(async () => ({
      signature: 'c2ln',
      address: RAW,
      timestamp: 1_793_900_000,
      domain: 'app.aave.com',
      payload: { type: 'text', text: 'x' },
    })),
    sendTransaction: vi.fn(),
    /** The wallet approved: TON Connect reports it. */
    approve: (wallet: Wallet) => {
      stub.connected = true;
      stub.wallet = wallet;
      status(wallet);
    },
    reject: () => errors(new UserRejectsError() as never),
  };

  return stub;
};

const clientWith = (ton: ReturnType<typeof fakeTonConnect>) =>
  createTonConnectClient({
    manifestUrl: 'https://manifest.test/tonconnect-manifest.json',
    createConnector: () => ton as unknown as TonConnectLike,
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the TON Connect client', () => {
  it('lists installed extensions and connects one, user-friendly and non-bounceable', async () => {
    const ton = fakeTonConnect();
    const client = clientWith(ton);

    expect(await client.listExtensions()).toEqual([
      {
        appName: 'tonkeeper',
        name: 'Tonkeeper',
        icon: 'https://icons.test/tonkeeper.png',
        jsBridgeKey: 'tonkeeper',
      },
    ]);

    const connecting = client.connectExtension('tonkeeper');

    await vi.waitFor(() =>
      expect(ton.connect).toHaveBeenCalledWith({ jsBridgeKey: 'tonkeeper' }),
    );
    ton.approve(tonkeeper());

    await expect(connecting).resolves.toMatchObject({
      address: FRIENDLY,
      rawAddress: RAW,
      name: 'Tonkeeper',
      jsBridgeKey: 'tonkeeper',
      signsText: true,
      mainnet: true,
    });
    expect(FRIENDLY.startsWith('UQ')).toBe(true);
  });

  it('pairs a phone with one universal link over every bridge, once each', async () => {
    const ton = fakeTonConnect();
    const client = clientWith(ton);
    const onUri = vi.fn();
    const pairing = client.pair(onUri);

    await vi.waitFor(() =>
      expect(onUri).toHaveBeenCalledWith('tc://?v=2&id=1'),
    );

    expect(ton.connect.mock.calls[0]![0]).toEqual([
      { bridgeUrl: 'https://bridge.tonapi.io/bridge' },
      { bridgeUrl: 'https://tonconnectbridge.mytonwallet.org/bridge' },
    ]);

    ton.approve({ ...tonkeeper(), provider: 'http' });

    await expect(pairing).resolves.toMatchObject({ jsBridgeKey: undefined });
  });

  it('reports a refusal as a user rejection, and an abandoned pairing', async () => {
    const ton = fakeTonConnect();
    const client = clientWith(ton);
    const refused = client.connectExtension('tonkeeper');

    await vi.waitFor(() => expect(ton.connect).toHaveBeenCalled());
    ton.reject();

    expect(isUserRejection(await refused.catch((error) => error))).toBe(true);

    const pairing = client.pair(() => undefined);

    await vi.waitFor(() => expect(ton.connect).toHaveBeenCalledTimes(2));
    await client.abortPairing();

    await expect(pairing).rejects.toThrow(/abandoned/);
  });

  it('signs text as the connected account, on mainnet', async () => {
    const ton = fakeTonConnect();
    const client = clientWith(ton);
    const connecting = client.connectExtension('tonkeeper');

    await vi.waitFor(() => expect(ton.connect).toHaveBeenCalled());
    ton.approve(tonkeeper());
    await connecting;

    await expect(client.signText('payload')).resolves.toEqual({
      signature: 'c2ln',
      address: RAW,
      timestamp: 1_793_900_000,
      domain: 'app.aave.com',
    });
    expect(ton.signData).toHaveBeenCalledWith({
      type: 'text',
      text: 'payload',
      network: CHAIN.MAINNET,
      from: RAW,
    });
  });
});

describe('toTonWalletConnector', () => {
  const client = clientWith(fakeTonConnect());
  const peer = {
    address: FRIENDLY,
    rawAddress: RAW,
    publicKey: 'ed25519:11111111111111111111111111111112',
    appName: 'tonkeeper',
    name: 'Tonkeeper',
    signsText: true,
    mainnet: true,
  };

  it('is a ton_connect connector with the public key', () => {
    const { connector } = toTonWalletConnector(client, peer);

    expect(connector).toMatchObject({
      id: 'ton:tonkeeper',
      chains: ['ton'],
      signingStandard: 'ton_connect',
    });
    expect(connector?.getPublicKey?.()).toBe(peer.publicKey);
  });

  it('refuses a wallet it could not sign or pay with', () => {
    expect(
      toTonWalletConnector(client, { ...peer, signsText: false })
        .unsupportedReason,
    ).toBe('NO_SIGN_DATA');
    expect(
      toTonWalletConnector(client, { ...peer, publicKey: undefined })
        .unsupportedReason,
    ).toBe('MISSING_PUBLIC_KEY');
    expect(
      toTonWalletConnector(client, { ...peer, mainnet: false })
        .unsupportedReason,
    ).toBe('WRONG_NETWORK');
    expect(toTonWalletConnector(client, null).unsupportedReason).toBe(
      'NOT_CONNECTED',
    );
  });
});

describe('TON makeTransfer', () => {
  /** What a wallet returns: an external message to its own contract. */
  const externalBoc = beginCell()
    .store(
      storeMessage({
        info: {
          type: 'external-in',
          src: null,
          dest: Address.parseRaw(RAW),
          importFee: 0n,
        },
        init: null,
        body: beginCell().storeUint(7, 32).endCell(),
      }),
    )
    .endCell()
    .toBoc()
    .toString('base64');

  const connected = async () => {
    const ton = fakeTonConnect();
    const client = clientWith(ton);
    const connecting = client.connectExtension('tonkeeper');

    await vi.waitFor(() => expect(ton.connect).toHaveBeenCalled());
    ton.approve(tonkeeper());
    await connecting;
    ton.sendTransaction.mockResolvedValue({ boc: externalBoc });

    return { ton, client };
  };

  const toncenter = (routes: Record<string, unknown>) =>
    vi.fn(async (url: string) => {
      const body = Object.entries(routes).find(([path]) =>
        url.includes(path),
      )?.[1];

      return {
        ok: body !== undefined,
        status: body ? 200 : 404,
        json: async () => body,
      };
    });

  it('sends TON non-bounceable, and returns the transaction it landed in', async () => {
    const { ton, client } = await connected();
    const fetch = toncenter({
      transactionsByMessage: {
        transactions: [
          { hash: Buffer.from('ab'.repeat(32), 'hex').toString('base64') },
        ],
      },
    });

    vi.stubGlobal('fetch', fetch);

    await expect(
      makeTransfer(
        {
          address: DEPOSIT_BOUNCEABLE,
          amountAtomic: '2500000000',
          decimals: 9,
          chain: 'ton',
        },
        { client, pollIntervalMs: 0 },
      ),
    ).resolves.toEqual({ hash: 'ab'.repeat(32) });

    const [{ messages }] = ton.sendTransaction.mock.calls[0]!;

    expect(messages).toEqual([
      {
        address: Address.parse(DEPOSIT_BOUNCEABLE).toString({
          bounceable: false,
          urlSafe: true,
        }),
        amount: '2500000000',
        payload: undefined,
      },
    ]);
    expect(fetch.mock.calls[0]![0]).toContain(
      `msg_hash=${normalizedMessageHash(externalBoc)}`,
    );
  });

  it("moves a jetton through the sender's jetton wallet, with TON for fees", async () => {
    const { ton, client } = await connected();

    vi.stubGlobal(
      'fetch',
      toncenter({
        'jetton/wallets': { jetton_wallets: [{ address: JETTON_WALLET_RAW }] },
      }),
    );

    // Not confirmed in time: the message hash, rather than a failure.
    await expect(
      makeTransfer(
        {
          address: DEPOSIT_BOUNCEABLE,
          amountAtomic: '3000000',
          decimals: 6,
          chain: 'ton',
          tokenAddress: USDT_MASTER,
        },
        { client, pollIntervalMs: 0, confirmationTimeoutMs: 5 },
      ),
    ).resolves.toEqual({ hash: normalizedMessageHash(externalBoc) });

    const [{ messages }] = ton.sendTransaction.mock.calls[0]!;
    const [message] = messages;

    expect(message.address).toBe(
      Address.parseRaw(JETTON_WALLET_RAW).toString({
        bounceable: true,
        urlSafe: true,
      }),
    );
    expect(message.amount).toBe('50000000');

    const body = Cell.fromBase64(message.payload).beginParse();

    expect(body.loadUint(32)).toBe(0x0f8a7ea5);

    body.loadUintBig(64);

    expect(body.loadCoins()).toBe(3_000_000n);
    expect(body.loadAddress().equals(Address.parse(DEPOSIT_BOUNCEABLE))).toBe(
      true,
    );
    expect(body.loadAddress().equals(Address.parseRaw(RAW))).toBe(true);
    expect(body.loadBit()).toBe(false);
    expect(body.loadCoins()).toBe(1n);
  });

  it('turns a refused transaction into a user rejection', async () => {
    const { ton, client } = await connected();

    ton.sendTransaction.mockRejectedValue(new UserRejectsError());

    const error = await makeTransfer(
      {
        address: DEPOSIT_BOUNCEABLE,
        amountAtomic: '1',
        decimals: 9,
        chain: 'ton',
      },
      { client },
    ).catch((caught: unknown) => caught);

    expect(isUserRejection(error)).toBe(true);
  });
});
