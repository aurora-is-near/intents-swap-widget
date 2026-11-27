import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deepClone } from 'valtio/utils';
import type { WidgetConfig } from '@aurora-is-near/intents-swap-widget';
import type { ReactNode } from 'react';

import { SwapWidget } from '../SwapWidget';

const { received, wallet } = vi.hoisted(() => ({
  received: { config: undefined as Partial<WidgetConfig> | undefined },
  wallet: {
    address: '0xabc' as string | undefined,
    isConnected: true,
    family: 'evm' as const,
    connect: vi.fn(() => Promise.resolve()),
    // A plain function: a `vi.fn` attaches its own `then` to a returned
    // promise to track it, which would hide a missing handler.
    disconnect: (): Promise<void> => Promise.resolve(),
    wallet: { getProviders: () => ({ evm: { request: vi.fn() } }) },
  },
}));

// The widget itself needs the network: a stand-in that keeps the config.
vi.mock('@aurora-is-near/intents-swap-widget', () => ({
  Widget: () => null,
  WidgetConfigProvider: ({
    config,
    children,
  }: {
    config: Partial<WidgetConfig>;
    children: ReactNode;
  }) => {
    received.config = config;

    return children;
  },
}));

vi.mock('@aurora-is-near/intents-swap-widget-evm', () => ({ evm: {} }));
vi.mock('@aurora-is-near/intents-swap-widget-solana', () => ({ sol: {} }));
vi.mock('@aurora-is-near/intents-swap-widget-stellar', () => ({ stellar: {} }));

vi.mock('@aurora-is-near/ui-kit', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('@/domains/wallet/hooks/useWallet', () => ({
  useWallet: () => wallet,
}));

const configFor = (mode: 'confidential' | 'public') => {
  render(<SwapWidget mode={mode} />);

  if (!received.config) {
    throw new Error('SwapWidget rendered no WidgetConfigProvider');
  }

  return received.config;
};

describe('SwapWidget', () => {
  beforeEach(() => {
    received.config = undefined;
    wallet.connect.mockClear();
  });

  it.each(['confidential', 'public'] as const)(
    'routes the widget %s',
    (mode) => {
      expect(configFor(mode).confidentialMode).toBe(mode);
    },
  );

  it('hands the widget the connected wallet', () => {
    const config = configFor('confidential');

    expect(config.connectedWallets).toEqual({ default: '0xabc' });
    expect(config.intentsAccountType).toBe('evm');
    expect(config.providers?.evm).toBeDefined();
  });

  it('keeps the wallet providers whole through the config deep copy', () => {
    const config = configFor('confidential');

    // WidgetConfigProvider deep-copies its config with valtio.
    expect(deepClone(config).providers).toBe(config.providers);
  });

  it('opens the connect modal from the widget', () => {
    configFor('confidential').onWalletSignin?.();

    expect(wallet.connect).toHaveBeenCalledOnce();
  });

  it('handles a refused sign-out', () => {
    const refusal = Promise.reject(new Error('refused'));
    const then = vi.spyOn(refusal, 'then');

    wallet.disconnect = () => refusal;
    configFor('confidential').onWalletSignout?.();

    expect(then).toHaveBeenCalled();
  });
});
