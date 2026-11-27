import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_WALLET_SELECTOR_THEME } from '@/connect/theme';
import { WalletSelectorModal } from '@/connect/WalletSelectorModal';
import type { WalletOption } from '@/connect/types';

const Dot = () => <svg data-testid="dot" />;

const OPTIONS: WalletOption[] = [
  {
    id: 'evm-solana',
    title: 'EVM / Solana',
    description: 'MetaMask',
    icons: [{ Icon: Dot }, { Icon: Dot, backgroundColor: 'rgb(1, 2, 3)' }],
  },
  { id: 'near', title: 'NEAR', description: 'Hot', icons: [] },
];

const renderModal = (
  props: Partial<Parameters<typeof WalletSelectorModal>[0]> = {},
) => {
  const onClose = vi.fn();
  const onSelect = vi.fn();

  render(
    <WalletSelectorModal
      onClose={onClose}
      onSelect={onSelect}
      open
      options={OPTIONS}
      {...props}
    />,
  );

  return { onClose, onSelect };
};

afterEach(cleanup);

describe('WalletSelectorModal', () => {
  it('keeps the dark look without a theme', () => {
    renderModal();

    const title = screen.getByRole('heading', { name: 'Connect wallet' });
    const row = screen.getByRole('button', { name: /EVM \/ Solana/ });

    expect(title).toHaveStyle({ color: '#F3F3F5', textAlign: 'center' });
    expect(row).toHaveStyle({ backgroundColor: '#252525' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveStyle({
      color: DEFAULT_WALLET_SELECTOR_THEME.closeIcon,
    });
  });

  it('draws with the theme it is given', () => {
    renderModal({
      theme: {
        panelBackground: 'rgb(10, 10, 10)',
        text: 'rgb(20, 20, 20)',
        mutedText: 'rgb(30, 30, 30)',
        closeIcon: 'rgb(40, 40, 40)',
        optionBackground: 'rgb(50, 50, 50)',
        optionHoverBackground: 'rgb(60, 60, 60)',
        iconBackground: 'rgb(70, 70, 70)',
        titleAlign: 'left',
      },
    });

    const title = screen.getByRole('heading', { name: 'Connect wallet' });
    const row = screen.getByRole('button', { name: /EVM \/ Solana/ });

    expect(title).toHaveStyle({ color: 'rgb(20, 20, 20)', textAlign: 'left' });
    expect(title.closest('[style*="max-width"]')).toHaveStyle({
      backgroundColor: 'rgb(10, 10, 10)',
    });
    expect(screen.getByText('MetaMask')).toHaveStyle({
      color: 'rgb(30, 30, 30)',
    });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveStyle({
      color: 'rgb(40, 40, 40)',
    });
    expect(row).toHaveStyle({ backgroundColor: 'rgb(50, 50, 50)' });

    fireEvent.mouseEnter(row);

    expect(row).toHaveStyle({ backgroundColor: 'rgb(60, 60, 60)' });

    // The theme's background only where the preset names none.
    const [plain, own] = screen
      .getAllByTestId('dot')
      .map((dot) => dot.parentElement);

    expect(plain).toHaveStyle({ backgroundColor: 'rgb(70, 70, 70)' });
    expect(own).toHaveStyle({ backgroundColor: 'rgb(1, 2, 3)' });
  });

  it('reports the picked option', () => {
    const { onSelect } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /NEAR/ }));

    expect(onSelect).toHaveBeenCalledWith('near');
  });

  it('closes from the close button and on Escape', () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('is not shown while closed', () => {
    renderModal({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
