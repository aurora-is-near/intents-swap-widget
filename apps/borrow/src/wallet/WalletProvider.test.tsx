import { ThemeProvider, useTheme } from '@aurora-is-near/ui-kit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createContext, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { WalletProvider } from './WalletProvider';

const appKit = vi.hoisted(() => ({
  props: [] as Array<Record<string, unknown>>,
  setThemeMode: vi.fn(),
}));

vi.mock('../config', () => ({ REOWN_PROJECT_ID: 'borrow-project' }));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () => {
  const AppKitContext = createContext<
    { isLoading: boolean; appKit: unknown } | undefined
  >(undefined);

  return {
    AppKitContext,
    AppKitProvider: ({
      children,
      ...props
    }: Record<string, unknown> & { children: ReactNode }) => {
      appKit.props.push(props);

      return (
        <AppKitContext.Provider
          value={{
            isLoading: false,
            appKit: { setThemeMode: appKit.setThemeMode },
          }}>
          {children}
        </AppKitContext.Provider>
      );
    },
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

describe('WalletProvider', () => {
  it('starts AppKit in the resolved theme and follows theme changes', async () => {
    render(
      <ThemeProvider>
        <WalletProvider>
          <ThemeSwitch />
        </WalletProvider>
      </ThemeProvider>,
    );

    expect(appKit.props[0]).toMatchObject({
      themeMode: 'light',
      projectId: 'borrow-project',
      appName: 'Aurora Borrow',
    });
    expect(appKit.setThemeMode).toHaveBeenLastCalledWith('light');

    await userEvent.click(screen.getByRole('button', { name: 'Switch theme' }));

    expect(appKit.setThemeMode).toHaveBeenLastCalledWith('dark');
  });
});
