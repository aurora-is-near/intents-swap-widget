import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WalletButton } from '../WalletButton';

const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  isConnected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('../../../hooks/useWallet', () => ({
  useWallet: () => wallet,
}));

const ADDRESS = '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';

describe('WalletButton', () => {
  beforeEach(() => {
    wallet.address = undefined;
    wallet.isConnected = false;
    wallet.connect.mockReset().mockResolvedValue(undefined);
    wallet.disconnect.mockReset().mockResolvedValue(undefined);
  });

  it('offers to connect while disconnected and opens the connect flow', async () => {
    render(<WalletButton />);

    const button = screen.getByRole('button', { name: 'Connect wallet' });

    expect(button.querySelector('span[aria-hidden="true"]')).toBeNull();

    await userEvent.click(button);

    expect(wallet.connect).toHaveBeenCalledTimes(1);
    expect(wallet.disconnect).not.toHaveBeenCalled();
  });

  it('does not surface a cancelled connection as an error', async () => {
    wallet.connect.mockRejectedValue(
      new Error('Wallet connection was cancelled'),
    );
    render(<WalletButton />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Connect wallet' }),
    );

    expect(wallet.connect).toHaveBeenCalledTimes(1);
  });

  it('shows the shortened address when connected and disconnects on click', async () => {
    wallet.address = ADDRESS;
    wallet.isConnected = true;
    render(<WalletButton />);

    const button = screen.getByRole('button', {
      name: 'Wallet 0x7a3f…9c21 connected. Click to disconnect',
    });

    expect(button).toHaveTextContent('0x7a3f…9c21');
    expect(button.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Connect wallet' }),
    ).not.toBeInTheDocument();

    await userEvent.click(button);

    expect(wallet.disconnect).toHaveBeenCalledTimes(1);
    expect(wallet.connect).not.toHaveBeenCalled();
  });
});
