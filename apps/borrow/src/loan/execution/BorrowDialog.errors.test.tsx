import '../../tests/pointerEvent';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BorrowDialog, type BorrowDialogLoan } from './BorrowDialog';
import type { BorrowErrorKind } from './classifyBorrowError';
import { errorCopy } from './errorCopy';
import type { BorrowPreviewFigures } from './previewFigures';
import { borrowDialogStep } from './BorrowDialog';

const LOAN: BorrowDialogLoan = {
  paid: {
    symbol: 'WETH',
    decimals: 18,
    chainName: 'Arbitrum',
    amount: 10n ** 18n,
  },
  collateral: { symbol: 'WETH', decimals: 18 },
  borrow: { symbol: 'USDC', decimals: 6 },
  market: {
    name: 'Aave',
    chainLabel: 'Base',
    borrowApr: 0.0485,
    liquidationLtvBps: 8100,
  },
  recipient: undefined,
  walletAddress: '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21',
};

const FIGURES: BorrowPreviewFigures = {
  collateralExpected: 996n * 10n ** 15n,
  minimumReceived: 986n * 10n ** 15n,
  rate: undefined,
  borrowAmount: 1_479_000_000n,
  fee: 3n * 10n ** 15n,
  ltvBps: 5001n,
  liquidationPrice: 185_185_185_185n,
  healthHundredths: 161n,
};

const stateOf = (error: BorrowErrorKind) =>
  ({ kind: 'error', error, cause: undefined }) as const;

const renderError = (error: BorrowErrorKind, withFigures = true) => {
  const handlers = {
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onViewPosition: vi.fn(),
    onAction: vi.fn(),
  };

  render(
    <BorrowDialog
      figures={withFigures ? FIGURES : undefined}
      loan={LOAN}
      step={borrowDialogStep(stateOf(error))}
      {...handlers}
    />,
  );

  return handlers;
};

const CASES: [
  BorrowErrorKind,
  string,
  string,
  'retry' | 'refresh' | 'close',
][] = [
  ['rejected', 'Signature rejected', 'Try again', 'retry'],
  ['noGas', 'Not enough for the network fee', 'Try again', 'retry'],
  ['priceMoved', 'Collateral price moved', 'Refresh quote', 'refresh'],
  [
    'noLiquidity',
    'Not enough to borrow in Aave',
    'Choose another market',
    'close',
  ],
  ['delayed', 'Taking longer than usual', 'Close and keep tracking', 'close'],
  ['unknown', 'Something went wrong', 'Close', 'close'],
];

describe('BorrowDialog error states', () => {
  it.each(CASES)(
    '%s: title, text and a button that calls %s',
    async (error, title, button, action) => {
      const user = userEvent.setup();
      const handlers = renderError(error);

      const banner = screen.getByRole(error === 'delayed' ? 'status' : 'alert');

      expect(within(banner).getByText(title)).toBeInTheDocument();
      expect(
        within(banner).getByText(
          errorCopy[error].text({
            chainName: 'Arbitrum',
            collateralSymbol: 'WETH',
            borrowSymbol: 'USDC',
            marketName: 'Aave',
          }),
        ),
      ).toBeInTheDocument();

      // The dialog's own close button is also named "Close".
      const [primary] = screen
        .getAllByRole('button', { name: button })
        .filter((element) => !element.hasAttribute('aria-label'));

      await user.click(primary as HTMLElement);

      expect(handlers.onAction).toHaveBeenCalledExactlyOnceWith(action);
    },
  );

  it('uses the warn tone only for delayed, and keeps its step running', () => {
    renderError('delayed');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Go to my positions' }),
    ).toBeVisible();
    expect(screen.getByText(/In progress/)).toBeInTheDocument();
  });

  it('marks the failed step on an error', () => {
    renderError('rejected');

    expect(screen.getByText(/Failed/)).toBeInTheDocument();
  });

  it('cancels from Cancel on an error', async () => {
    const user = userEvent.setup();
    const handlers = renderError('rejected');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(handlers.onCancel).toHaveBeenCalledOnce();
  });

  it('shows a pre-check error without a dry run', () => {
    renderError('noGas', false);

    expect(screen.getByText('Not enough for the network fee')).toBeVisible();
  });

  it('offers the hook’s action, with a generic label, when it differs from the table', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <BorrowDialog
        figures={FIGURES}
        loan={LOAN}
        step={borrowDialogStep(stateOf('rejected'), 'reconnect')}
        onAction={onAction}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onViewPosition={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reconnect wallet' }));

    expect(onAction).toHaveBeenCalledWith('reconnect');
  });

  it('says the collateral is held, not that nothing was sent, when funds are waiting', () => {
    render(
      <BorrowDialog
        figures={FIGURES}
        loan={LOAN}
        step={borrowDialogStep(stateOf('priceMoved'), 'close', true)}
        onAction={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onViewPosition={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Nothing was sent/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Review the new quote/)).not.toBeInTheDocument();
    expect(screen.getByText(/collateral arrived and is held/)).toBeVisible();
  });

  it('offers plain Close, not another market, when funds are waiting on noLiquidity', () => {
    render(
      <BorrowDialog
        figures={FIGURES}
        loan={LOAN}
        step={borrowDialogStep(stateOf('noLiquidity'), 'close', true)}
        onAction={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onViewPosition={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Choose another market' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/collateral arrived and is held/)).toBeVisible();
  });

  it('closes a warning with Escape as the close action, not a cancel', async () => {
    const user = userEvent.setup();
    const handlers = renderError('delayed');

    await user.keyboard('{Escape}');

    expect(handlers.onAction).toHaveBeenCalledWith('close');
    expect(handlers.onCancel).not.toHaveBeenCalled();
  });

  it('an unknown error always closes, whatever the hook offers', () => {
    expect(borrowDialogStep(stateOf('unknown'), 'retry')).toEqual({
      kind: 'error',
      error: 'unknown',
      action: 'close',
      fundsWaiting: false,
    });
  });
});
