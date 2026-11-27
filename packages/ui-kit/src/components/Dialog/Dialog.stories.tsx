import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../Button/Button';
import { Spinner } from '../Spinner/Spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './Dialog';
import type { DialogProps } from './Dialog';

/**
 * The confirm modal: title, description, a summary block and the action.
 * Controlled, as the app opens it: a button sets `open`.
 */
function ConfirmLoanDialog({ defaultOpen = false, ...props }: DialogProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="md">
        Review loan
      </Button>
      <Dialog {...props} onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogTitle>Confirm loan</DialogTitle>
          <DialogDescription>
            Borrow 1,000 USDC against 1 ETH.
          </DialogDescription>
          <div className="mt-4 rounded-18 bg-sf2 px-4 py-2.75 text-15 text-mut">
            Loan summary rows go here.
          </div>
          <Button className="mt-5" onClick={() => setOpen(false)}>
            Confirm in wallet
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  subcomponents: { DialogContent, DialogTitle, DialogDescription },
  args: { dismissible: true },
  argTypes: {
    dismissible: { control: 'boolean' },
    closeButton: { control: 'boolean' },
  },
  render: (args) => <ConfirmLoanDialog {...args} />,
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Open it with the button. "Confirm in wallet" sets `open` to false, so it
 * closes the dialog even with `dismissible` off.
 */
export const Playground: Story = {};

/**
 * Open on load, to see the popup in the canvas (at 640px or narrower it is a
 * bottom sheet). Left out of the docs page, where it would cover the page.
 */
export const Open: Story = {
  tags: ['!autodocs'],
  args: { defaultOpen: true },
};

/** Closes the non-dismissible dialog, as the app does once signing ends. */
const SIGNING_MS = 4000;

function SigningDialog() {
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!signing) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSigning(false), SIGNING_MS);

    return () => window.clearTimeout(timer);
  }, [signing]);

  return (
    <>
      <Button onClick={() => setSigning(true)} size="md" variant="secondary">
        Sign (not dismissible)
      </Button>
      <Dialog dismissible={false} onOpenChange={setSigning} open={signing}>
        <DialogContent>
          <DialogTitle>Waiting for signature</DialogTitle>
          <DialogDescription>
            Escape and outside presses are ignored. Closes in{' '}
            {SIGNING_MS / 1000} seconds.
          </DialogDescription>
          <div className="mt-4 flex items-center gap-3 text-15 font-semibold">
            <Spinner size={20} /> Confirm in your wallet
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * `dismissible={false}`, as while a transaction is being signed: no close
 * button, and Escape and outside presses are ignored. Controlled; the app
 * closes it, here after four seconds.
 */
export const NotDismissible: Story = {
  render: () => <SigningDialog />,
};

function SuccessDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="md">
        Show success
      </Button>
      <Dialog closeButton={false} onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogTitle>Loan opened</DialogTitle>
          <DialogDescription>
            1,000 USDC is on its way to your wallet.
          </DialogDescription>
          <Button className="mt-5" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Dismissible without a close button, as the success message: Escape, an
 * outside press or its own action closes it.
 */
export const WithoutCloseButton: Story = {
  render: () => <SuccessDialog />,
};

/** Both dialogs: the confirm modal and the signing one. */
export const AllDialogs: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <ConfirmLoanDialog />
      <SigningDialog />
    </div>
  ),
};

/** Longer than the screen: the content scrolls inside the popup. */
function LongDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="md">
        Review terms
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogTitle>Loan terms</DialogTitle>
          <DialogDescription>Scroll to read them all.</DialogDescription>
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 30 }, (_, index) => (
              <div
                key={index}
                className="rounded-12 bg-sf2 px-4 py-2.75 text-15 text-mut">
                Term {index + 1}
              </div>
            ))}
          </div>
          <Button className="mt-5" onClick={() => setOpen(false)}>
            Accept
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Taller than the screen: the content scrolls inside the popup with the
 * close button pinned, and the 3px scrollbar shows in the right padding
 * only while scrolling.
 */
export const LongContent: Story = {
  render: () => <LongDialog />,
};
