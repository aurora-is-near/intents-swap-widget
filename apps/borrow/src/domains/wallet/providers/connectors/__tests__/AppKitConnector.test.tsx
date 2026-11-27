import { ThemeProvider, useTheme } from '@aurora-is-near/ui-kit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { Connector } from '../AppKitConnector';

const appKit = vi.hoisted(() => ({
  props: [] as Array<Record<string, unknown>>,
  setThemeMode: vi.fn(),
  instance: null as unknown,
}));

const connector = vi.hoisted(() => ({
  id: 'evm-solana',
  isConnected: false,
  address: undefined,
  connect: () => {},
  disconnect: () => {},
}));

vi.mock('@/config', () => ({ REOWN_PROJECT_ID: 'borrow-project' }));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () => {
  const AppKitContext = createContext<{ appKit: unknown } | undefined>(
    undefined,
  );

  return {
    AppKitContext,
    AppKitProvider: ({
      children,
      ...props
    }: Record<string, unknown> & { children: ReactNode }) => {
      appKit.props.push(props);

      return (
        <AppKitContext.Provider value={{ appKit: appKit.instance }}>
          {children}
        </AppKitContext.Provider>
      );
    },
    useAppKitConnector: () => connector,
    useIntentsConnectWallet: () => ({ family: null, wallet: null }),
  };
});

function ThemeSwitch() {
  const { theme, setPreference } = useTheme();

  return (
    <button
      onClick={() => setPreference(theme === 'dark' ? 'light' : 'dark')}
      type="button">
      Switch theme
    </button>
  );
}

describe('AppKitConnector', () => {
  it('starts AppKit in the resolved theme and the kit font, and follows theme changes', async () => {
    appKit.instance = { setThemeMode: appKit.setThemeMode };
    render(
      <ThemeProvider>
        <Connector onChange={() => {}} />
        <ThemeSwitch />
      </ThemeProvider>,
    );

    expect(appKit.props[0]).toMatchObject({
      themeMode: 'light',
      projectId: 'borrow-project',
      appName: 'Aurora Borrow',
      themeVariables: {
        '--w3m-font-family': expect.stringContaining('Schibsted Grotesk'),
      },
    });
    expect(appKit.setThemeMode).toHaveBeenLastCalledWith('light');

    await userEvent.click(screen.getByRole('button', { name: 'Switch theme' }));

    expect(appKit.setThemeMode).toHaveBeenLastCalledWith('dark');
  });

  it('reports its connector only once AppKit exists', async () => {
    const onChange = vi.fn();

    appKit.instance = null;

    const { rerender } = render(
      <ThemeProvider>
        <Connector onChange={onChange} />
      </ThemeProvider>,
    );

    expect(onChange).not.toHaveBeenCalled();

    appKit.instance = { setThemeMode: appKit.setThemeMode };
    rerender(
      <ThemeProvider>
        <Connector onChange={onChange} />
      </ThemeProvider>,
    );

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        connector,
        wallet: null,
        family: null,
      }),
    );
  });
});
