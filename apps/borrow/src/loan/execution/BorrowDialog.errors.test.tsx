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

/** An error the flow raised before anything was signed. */
const unsignedStateOf = (error: BorrowErrorKind) =>
  ({ ...stateOf(error), step: null }) as const;

/** The progress steps' statuses, as their screen-reader text says them. */
const stepStatuses = () =>
  within(screen.getByRole('list', { name: 'Loan progress' }))
    .getAllByRole('listitem')
    .map(
      (item) =>
        /(Done|In progress|Failed|Waiting):/.exec(item.textContent ?? '')?.[1],
    );

const renderStep = (step: ReturnType<typeof borrowDialogStep>) =>
  render(
    <BorrowDialog
      figures={FIGURES}
      loan={LOAN}
      step={step}
      onAction={vi.fn()}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      onViewPosition={vi.fn()}
    />,
  );

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
  ['noRoute', 'No route for this amount', 'Back to the form', 'close'],
  ['quoteChanged', 'The quote changed', 'Refresh quote', 'refresh'],
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

  it('marks no step on no route: nothing was sent', () => {
    renderStep(borrowDialogStep(unsignedStateOf('noRoute')));

    expect(stepStatuses()).toEqual(['Waiting', 'Waiting', 'Waiting']);
    expect(screen.getByText(/Nothing was sent/)).toBeVisible();
    expect(
      screen.getByText(/larger amount, or another asset or chain/),
    ).toBeVisible();
  });

  it('marks no step on no route even without the flow’s step', () => {
    renderStep(borrowDialogStep(stateOf('noRoute')));

    expect(stepStatuses()).toEqual(['Waiting', 'Waiting', 'Waiting']);
  });

  it('says nothing was signed on a quote change before signing, and marks no step', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <BorrowDialog
        figures={FIGURES}
        loan={LOAN}
        step={borrowDialogStep(unsignedStateOf('quoteChanged'))}
        onAction={onAction}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onViewPosition={vi.fn()}
      />,
    );

    expect(stepStatuses()).toEqual(['Waiting', 'Waiting', 'Waiting']);
    expect(
      screen.getByText(
        'The quote changed while the loan was being prepared. Nothing was signed — review the new terms.',
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Refresh quote' }));

    expect(onAction).toHaveBeenCalledWith('refresh');
  });

  it('says the collateral is held, with the earlier steps done, when a steps-only retry’s quote changed', () => {
    renderStep(borrowDialogStep(stateOf('quoteChanged'), 'retry', true));

    expect(stepStatuses()).toEqual(['Done', 'Failed', 'Waiting']);
    expect(screen.getByText(/collateral arrived and is held/)).toBeVisible();
    expect(screen.queryByText(/Nothing was signed/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('marks no step on any error raised before signing', () => {
    renderStep(borrowDialogStep(unsignedStateOf('noGas')));

    expect(stepStatuses()).toEqual(['Waiting', 'Waiting', 'Waiting']);
  });

  it('does not send the user to their wallet for an unknown error before signing', () => {
    renderStep(borrowDialogStep(unsignedStateOf('unknown')));

    expect(stepStatuses()).toEqual(['Waiting', 'Waiting', 'Waiting']);
    expect(
      screen.queryByText(/wallet for what was sent/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/nothing was sent from your wallet/)).toBeVisible();
  });

  it('marks an unknown error after signing on the step the borrow reached', () => {
    renderStep(borrowDialogStep({ ...stateOf('unknown'), step: 1 }));

    expect(stepStatuses()).toEqual(['Done', 'Failed', 'Waiting']);
    expect(
      screen.getByText(/Check your wallet for what was sent/),
    ).toBeVisible();
  });

  it('keeps the price-moved marks after the deposit, without signing or max-LTV claims beyond the diagnosis', () => {
    renderStep(borrowDialogStep(stateOf('priceMoved'), 'retry', true));

    expect(stepStatuses()).toEqual(['Done', 'Failed', 'Waiting']);
    expect(screen.getByText(/collateral arrived and is held/)).toBeVisible();
    expect(screen.queryByText(/signing/)).not.toBeInTheDocument();
  });

  it('does not claim a max-LTV breach for the quote guard, nor that the user was signing', () => {
    renderStep(borrowDialogStep(unsignedStateOf('priceMoved')));

    const text = errorCopy.priceMoved.text({
      chainName: 'Arbitrum',
      collateralSymbol: 'WETH',
      borrowSymbol: 'USDC',
      marketName: 'Aave',
    });

    expect(text).not.toMatch(/maximum LTV|signing/);
    expect(screen.getByText(text)).toBeVisible();
    expect(stepStatuses()).toEqual(['Waiting', 'Waiting', 'Waiting']);
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

  it('names the execution whose collateral waits, and offers the steps-only retry', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <BorrowDialog
        figures={FIGURES}
        loan={LOAN}
        step={borrowDialogStep(
          stateOf('noLiquidity'),
          'retry',
          true,
          'exec-waiting-0001',
        )}
        onAction={onAction}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onViewPosition={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText('Execution').nextSibling).toHaveTextContent(
      'exec-waiting-0001',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Try again' }));

    expect(onAction).toHaveBeenCalledWith('retry');
  });

  it('names no execution while nothing waits', () => {
    expect(
      borrowDialogStep(stateOf('rejected'), 'retry', false, 'exec-1'),
    ).not.toHaveProperty('executionId');
  });
});
