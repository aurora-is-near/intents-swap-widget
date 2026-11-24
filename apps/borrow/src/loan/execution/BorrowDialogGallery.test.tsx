import '../../tests/pointerEvent';

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BorrowDialogGallery } from './BorrowDialogGallery';

afterEach(() => {
  vi.useRealTimers();
});

describe('BorrowDialogGallery', () => {
  it('has an entry for confirm, pending and done', () => {
    render(<BorrowDialogGallery />);

    expect(
      screen.getByRole('heading', { name: 'Borrow dialogs' }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual([
      'Confirm',
      'Confirm · converted',
      'Pending · signing',
      'Pending · step 2',
      'Pending · step 3',
      'Done',
    ]);
  });

  it('opens the confirm dialog, and the conversion rows for a converted loan', async () => {
    const user = userEvent.setup();

    render(<BorrowDialogGallery />);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(
      await screen.findByRole('dialog', { name: 'Confirm loan' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Rate')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole('button', { name: 'Confirm · converted' }),
    );

    expect(await screen.findByText('Rate')).toBeInTheDocument();
    expect(screen.getByText('Minimum received')).toBeInTheDocument();
  });

  it('turns a pending dialog, which cannot be closed, into done', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<BorrowDialogGallery />);

    await user.click(screen.getByRole('button', { name: 'Pending · step 2' }));

    expect(
      await screen.findByRole('dialog', { name: 'Confirm loan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent(
      'Supply collateral and open the loan',
    );

    await act(async () => {
      vi.advanceTimersByTime(8000);
    });

    expect(
      await screen.findByRole('dialog', { name: 'Loan opened' }),
    ).toBeInTheDocument();
  });
});
