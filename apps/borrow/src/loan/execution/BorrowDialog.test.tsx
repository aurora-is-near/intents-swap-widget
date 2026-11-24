import '../../tests/pointerEvent';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  BorrowDialog,
  type BorrowDialogLoan,
  type BorrowDialogStep,
  borrowDialogStep,
} from './BorrowDialog';
import type { BorrowPreviewFigures } from './previewFigures';

const WETH = { symbol: 'WETH', decimals: 18 };
const USDC = { symbol: 'USDC', decimals: 6 };

/** 1 WETH paid on Arbitrum, supplied as itself on Aave Base. */
const LOAN: BorrowDialogLoan = {
  paid: { ...WETH, chainName: 'Arbitrum', amount: 10n ** 18n },
  collateral: WETH,
  borrow: USDC,
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

/** 3,000 USDC paid, converted to WETH. */
const CONVERTED_LOAN: BorrowDialogLoan = {
  ...LOAN,
  paid: { ...USDC, chainName: 'Arbitrum', amount: 3_000_000_000n },
};

const CONVERTED_FIGURES: BorrowPreviewFigures = {
  ...FIGURES,
  collateralExpected: 995n * 10n ** 15n,
  minimumReceived: 985n * 10n ** 15n,
  rate: 331_666_666_666_666n,
};

const renderDialog = ({
  step,
  loan = LOAN,
  figures = FIGURES,
}: {
  step: BorrowDialogStep | undefined;
  loan?: BorrowDialogLoan;
  figures?: BorrowPreviewFigures;
}) => {
  const handlers = {
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onViewPosition: vi.fn(),
  };

  const view = render(
    <BorrowDialog figures={figures} loan={loan} step={step} {...handlers} />,
  );

  return {
    ...handlers,
    rerender: (next: BorrowDialogStep | undefined) =>
      view.rerender(
        <BorrowDialog
          figures={figures}
          loan={loan}
          step={next}
          {...handlers}
        />,
      ),
  };
};

/** The rows as label → value. */
const rows = () =>
  Object.fromEntries(
    within(screen.getByRole('dialog'))
      .getAllByRole('term')
      .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
  );

/** Each step's label with its status, as a screen reader reads it. */
const stepTexts = () =>
  within(screen.getByRole('list', { name: 'Loan progress' }))
    .getAllByRole('listitem')
    .map((item) => {
      // The waiting step's number is decorative.
      const read = item.cloneNode(true) as HTMLElement;

      read.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => {
        hidden.remove();
      });

      return read.textContent;
    });

describe('borrowDialogStep', () => {
  it('maps the flow to a dialog: signing is the first pending step', () => {
    expect(borrowDialogStep({ kind: 'idle' })).toBeUndefined();
    expect(borrowDialogStep({ kind: 'previewing' })).toBeUndefined();
    expect(borrowDialogStep({ kind: 'signing' })).toEqual({
      kind: 'pending',
      step: 0,
    });
    expect(borrowDialogStep({ kind: 'pending', step: 2 })).toEqual({
      kind: 'pending',
      step: 2,
    });
    expect(borrowDialogStep({ kind: 'done', executionId: 'e' })).toEqual({
      kind: 'done',
    });
    expect(
      borrowDialogStep({ kind: 'error', error: 'rejected', cause: undefined }),
    ).toBeUndefined();
  });
});

describe('BorrowDialog', () => {
  it('is closed without a step', () => {
    renderDialog({ step: undefined });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('confirm', () => {
    it('shows the dry run: collateral delivered, borrow, fee in the collateral, and the LTV', async () => {
      renderDialog({ step: { kind: 'confirm' } });

      const dialog = await screen.findByRole('dialog', {
        name: 'Confirm loan',
      });

      expect(dialog).toHaveAccessibleDescription(
        'Review the terms, then sign once in your wallet.',
      );
      expect(rows()).toEqual({
        Supply: '0.996 WETH · Base',
        Borrow: '1,479 USDC · Base',
        'Borrow fee': '−0.003 WETH',
        // The fee comes out of the collateral: the borrow arrives whole.
        'You receive': '1,479 USDC',
        Market: 'Aave · 4.85% APR',
        LTV: '50% · liquidation 81%',
        Recipient: 'Your wallet 0x7a3f…9c21',
      });
      // The same asset: no conversion rows.
      expect(rows()).not.toHaveProperty('Rate');
      expect(rows()).not.toHaveProperty('Minimum received');
    });

    it('adds what is paid, the collateral that arrives, the rate and the minimum received when the paid asset is converted', async () => {
      renderDialog({
        step: { kind: 'confirm' },
        loan: { ...CONVERTED_LOAN, recipient: '0x1b2c3d4e5f60718293a4' },
        figures: CONVERTED_FIGURES,
      });

      await screen.findByRole('dialog', { name: 'Confirm loan' });

      expect(rows()).toMatchObject({
        'You pay': '3,000 USDC · Arbitrum',
        Supply: '≈ 0.995 WETH · Base',
        Rate: '1 USDC ≈ 0.000332 WETH',
        'Minimum received': '0.985 WETH',
        Recipient: '0x1b2c3d4e5f60718293a4',
      });
    });

    it('lists the three steps, all waiting', async () => {
      renderDialog({ step: { kind: 'confirm' } });

      await screen.findByRole('dialog', { name: 'Confirm loan' });

      expect(stepTexts()).toEqual([
        'Waiting: Sign one intent',
        'Waiting: Supply collateral and open the loan',
        'Waiting: Bridge and deliver USDC',
      ]);
    });

    it('confirms in the wallet, or cancels from Cancel, the close button or Escape', async () => {
      const user = userEvent.setup();
      const { onConfirm, onCancel } = renderDialog({
        step: { kind: 'confirm' },
      });

      await screen.findByRole('dialog', { name: 'Confirm loan' });
      await user.click(
        screen.getByRole('button', { name: 'Confirm in wallet' }),
      );

      expect(onConfirm).toHaveBeenCalledOnce();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await user.click(screen.getByRole('button', { name: 'Close' }));
      await user.keyboard('{Escape}');

      expect(onCancel).toHaveBeenCalledTimes(3);
    });
  });

  describe('pending', () => {
    it('moves through the three steps', async () => {
      const { rerender } = renderDialog({ step: { kind: 'pending', step: 0 } });

      await screen.findByRole('dialog', { name: 'Confirm loan' });

      expect(stepTexts()).toEqual([
        'In progress: Sign one intent',
        'Waiting: Supply collateral and open the loan',
        'Waiting: Bridge and deliver USDC',
      ]);
      expect(screen.getByRole('status')).toHaveTextContent(
        'Check your wallet to sign. Don’t close this window.',
      );
      expect(
        screen.queryByRole('button', { name: 'Confirm in wallet' }),
      ).not.toBeInTheDocument();

      rerender({ kind: 'pending', step: 1 });

      expect(stepTexts()).toEqual([
        'Done: Sign one intent',
        'In progress: Supply collateral and open the loan',
        'Waiting: Bridge and deliver USDC',
      ]);

      rerender({ kind: 'pending', step: 2 });

      expect(stepTexts()).toEqual([
        'Done: Sign one intent',
        'Done: Supply collateral and open the loan',
        'In progress: Bridge and deliver USDC',
      ]);
    });

    it('cannot be closed: no close button or Cancel, and Escape or an outside press do nothing', async () => {
      const user = userEvent.setup();
      const { onCancel } = renderDialog({ step: { kind: 'pending', step: 1 } });

      const dialog = await screen.findByRole('dialog', {
        name: 'Confirm loan',
      });

      expect(
        screen.queryByRole('button', { name: 'Close' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Cancel' }),
      ).not.toBeInTheDocument();

      await user.keyboard('{Escape}');

      const outside = dialog.parentElement;

      if (outside) {
        await user.click(outside);
      }

      expect(onCancel).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog', { name: 'Confirm loan' })).toBe(dialog);
    });
  });

  describe('done', () => {
    it('says the loan is open and goes to the position', async () => {
      const user = userEvent.setup();
      const { onViewPosition } = renderDialog({ step: { kind: 'done' } });

      const dialog = await screen.findByRole('dialog', {
        name: 'Loan opened',
      });

      expect(dialog).toHaveAccessibleDescription(
        '1,479 USDC is on its way to your wallet.',
      );
      expect(
        screen.queryByRole('button', { name: 'Close' }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'View position' }));

      expect(onViewPosition).toHaveBeenCalledOnce();
    });

    it('names the other wallet the funds go to, and closes on Escape', async () => {
      const user = userEvent.setup();
      const { onCancel } = renderDialog({
        step: { kind: 'done' },
        loan: { ...LOAN, recipient: '0x1b2c3d4e5f60718293a4' },
      });

      const dialog = await screen.findByRole('dialog', {
        name: 'Loan opened',
      });

      expect(dialog).toHaveAccessibleDescription(
        '1,479 USDC is on its way to 0x1b2c3d4e5f60718293a4.',
      );

      await user.keyboard('{Escape}');

      await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
    });
  });
});
