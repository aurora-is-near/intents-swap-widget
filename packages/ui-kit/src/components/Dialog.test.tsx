// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './Dialog';

/*
 * Base UI returns focus after an outside press only where `focus()` reads
 * its `preventScroll` option, which it probes for (desktop browsers do;
 * Chrome on Android does not). jsdom ignores the option, so read it here as
 * a desktop browser does.
 */
beforeEach(() => {
  const { focus } = HTMLElement.prototype;

  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(
    function focusWithOptions(this: HTMLElement, options?: FocusOptions) {
      // Reading the option is what the probe looks for.
      focus.call(this, { preventScroll: options?.preventScroll });
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function ConfirmDialog({ dismissible }: { dismissible?: boolean }) {
  return (
    <Dialog dismissible={dismissible}>
      <DialogTrigger>Review loan</DialogTrigger>
      <DialogContent>
        <DialogTitle>Confirm loan</DialogTitle>
        <DialogDescription>Borrow 1,000 USDC against 1 ETH.</DialogDescription>
        <button type="button">Confirm in wallet</button>
      </DialogContent>
    </Dialog>
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Review loan' }));

  return screen.findByRole('dialog', { name: 'Confirm loan' });
}

/** What a person presses outside the popup: the area around it. */
function outsideOf(dialog: HTMLElement) {
  const viewport = dialog.parentElement;

  if (!viewport) {
    throw new Error('the dialog has no viewport');
  }

  return viewport;
}

describe('Dialog', () => {
  it('opens from the trigger as a dialog named by its title, with focus inside', async () => {
    const user = userEvent.setup();

    render(<ConfirmDialog />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const dialog = await openDialog(user);

    expect(dialog).toHaveAccessibleDescription(
      'Borrow 1,000 USDC against 1 ETH.',
    );

    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement),
    );
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();

    render(<ConfirmDialog />);
    await openDialog(user);
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    expect(screen.getByRole('button', { name: 'Review loan' })).toHaveFocus();
  });

  it('closes from the close button and returns focus to the trigger', async () => {
    const user = userEvent.setup();

    render(<ConfirmDialog />);

    const dialog = await openDialog(user);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Review loan' })).toHaveFocus();
  });

  it('closes on a backdrop press and returns focus to the trigger', async () => {
    const user = userEvent.setup();

    render(<ConfirmDialog />);

    const dialog = await openDialog(user);

    await user.click(outsideOf(dialog));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Review loan' })).toHaveFocus(),
    );
  });

  it('stays open on Escape and backdrop press, with no close button, when not dismissible', async () => {
    const user = userEvent.setup();

    render(<ConfirmDialog dismissible={false} />);

    const dialog = await openDialog(user);

    expect(
      screen.queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(outsideOf(dialog));

    expect(screen.getByRole('dialog', { name: 'Confirm loan' })).toBe(dialog);
  });

  it('has no close button with closeButton off, and still closes on Escape and backdrop press', async () => {
    const user = userEvent.setup();

    render(
      <Dialog closeButton={false}>
        <DialogTrigger>Review loan</DialogTrigger>
        <DialogContent>
          <DialogTitle>Loan opened</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Review loan' }));

    const dialog = await screen.findByRole('dialog', { name: 'Loan opened' });

    expect(
      screen.queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();
    // Nothing to keep clear of.
    expect(
      screen.getByRole('heading', { name: 'Loan opened' }),
    ).not.toHaveClass('pr-[48px]');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(dialog).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Review loan' }));

    const reopened = await screen.findByRole('dialog', { name: 'Loan opened' });

    await user.click(outsideOf(reopened));
    await waitFor(() => expect(reopened).not.toBeInTheDocument());
  });

  it('follows a controlled open and reports changes through onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    function Controlled() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Open from outside
          </button>
          <Dialog
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
            open={open}>
            <DialogContent>
              <DialogTitle>Confirm loan</DialogTitle>
              <DialogClose>Cancel</DialogClose>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Open from outside' }));

    expect(
      await screen.findByRole('dialog', { name: 'Confirm loan' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not tell a controlled, non-dismissible dialog to close on Escape or backdrop press', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    function Signing() {
      const [open, setOpen] = useState(true);

      return (
        <Dialog
          dismissible={false}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          open={open}>
          <DialogContent>
            <DialogTitle>Waiting for signature</DialogTitle>
          </DialogContent>
        </Dialog>
      );
    }

    render(<Signing />);

    const dialog = await screen.findByRole('dialog', {
      name: 'Waiting for signature',
    });

    await user.keyboard('{Escape}');
    await user.click(outsideOf(dialog));

    expect(screen.getByRole('dialog', { name: 'Waiting for signature' })).toBe(
      dialog,
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('closes from a DialogClose even when not dismissible', async () => {
    const user = userEvent.setup();

    render(
      <Dialog defaultOpen dismissible={false}>
        <DialogContent>
          <DialogTitle>Signing</DialogTitle>
          <DialogClose>Cancel</DialogClose>
        </DialogContent>
      </Dialog>,
    );

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
