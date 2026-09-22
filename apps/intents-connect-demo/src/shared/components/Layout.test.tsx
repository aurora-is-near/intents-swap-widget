import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { Layout } from './Layout';

const onChangeAmount = vi.fn();
const deposit = {
  isBusy: false,
  preparationError: undefined as Error | undefined,
};

// The widget package's dependency chain does not resolve under vitest, and
// this test is about the Layout's own banner logic, so its primitives are
// stand-ins.
vi.mock('@aurora-is-near/intents-swap-widget', () => ({
  Banner: ({ message, variant }: { message: string; variant: string }) => (
    <div data-variant={variant}>{message}</div>
  ),
  CopyButton: () => null,
  TinyNumber: ({ value }: { value: string }) => <span>{value}</span>,
  Toggle: ({
    isOn,
    onToggle,
  }: {
    isOn: boolean;
    onToggle: (value: boolean) => void;
  }) => (
    <button type="button" onClick={() => onToggle(!isOn)}>
      toggle
    </button>
  ),
  useUnsafeSnapshot: () => ({
    ctx: {
      sourceToken: { assetId: 'eth', blockchain: 'eth', decimals: 6 },
      sourceTokenAmount: '1000000',
      walletAddress: '0x1',
    },
  }),
  useTokenInputPair: () => ({ onChangeAmount }),
}));

vi.mock('@aurora-is-near/intents-swap-widget/utils', () => ({
  isNotEmptyAmount: (amount: string) => amount.trim() !== '',
}));

vi.mock('@aurora-is-near/intents-connect', () => ({
  GuardError: class GuardError extends Error {},
}));

vi.mock('./Widget', () => ({
  WidgetIntentsConnect: ({
    children,
    onUserInput,
  }: {
    children: ReactNode;
    onUserInput?: () => void;
  }) => (
    <div>
      <button type="button" onClick={onUserInput}>
        edit amount
      </button>
      {children}
    </div>
  ),
}));

vi.mock('./SubmitButton', () => ({
  SubmitButton: {
    Deposit: ({ label }: { label: string }) => (
      <button type="button">{label}</button>
    ),
    Cancel: () => null,
    Resume: () => null,
  },
}));

vi.mock('./DepositQrCode', () => ({ DepositQrCode: () => null }));
vi.mock('../copies', () => ({ STATUS_COPIES: {} }));

vi.mock('../hooks/useIntentsConnectDeposit', () => ({
  useIntentsConnectDeposit: () => ({
    state: 'IDLE',
    message: '',
    deposit: vi.fn(),
    depositViaWallet: true,
    isBusy: deposit.isBusy,
    preparationError: deposit.preparationError,
  }),
}));

const SUCCESS = 'Purchase completed';

const exec = (phase: UseExecutionResult['phase']) =>
  ({
    phase,
    isBusy: false,
    isCancelling: false,
    error: undefined,
    status: undefined,
    executionId: undefined,
    depositAddress: undefined,
    recovery: undefined,
    execution: undefined,
  }) as unknown as UseExecutionResult;

const layout = (phase: UseExecutionResult['phase'], inputsKey = 'ORCA') => (
  <Layout
    exec={exec(phase)}
    buildPlan={vi.fn()}
    destinationToken={{ symbol: 'USDC', decimals: 6 } as never}
    successMessage={SUCCESS}
    submitLabel="Buy"
    inputsKey={inputsKey}
    alchemyApiKey=""
  />
);

beforeEach(() => {
  onChangeAmount.mockClear();
  deposit.isBusy = false;
  deposit.preparationError = undefined;
});

afterEach(cleanup);

describe('Layout success message', () => {
  it('shows the message once the execution settles and clears the amount', () => {
    const { rerender } = render(layout('settling'));

    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();
    expect(onChangeAmount).not.toHaveBeenCalled();

    rerender(layout('success'));

    expect(screen.getByText(SUCCESS)).toBeInTheDocument();
    expect(onChangeAmount).toHaveBeenCalledTimes(1);
    expect(onChangeAmount).toHaveBeenCalledWith('source', '');
  });

  it('retires the message when the user edits the form', () => {
    const { rerender } = render(layout('settling'));

    rerender(layout('success'));
    fireEvent.click(screen.getByText('edit amount'));

    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();

    // Still gone on later renders: the phase alone never brings it back.
    rerender(layout('success'));

    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();
  });

  it('retires the message when the integration inputs change', () => {
    const { rerender } = render(layout('settling'));

    rerender(layout('success'));
    rerender(layout('success', 'KMNO'));

    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();
  });

  it('retires the message when the deposit mode changes', () => {
    const { rerender } = render(layout('settling'));

    rerender(layout('success'));
    fireEvent.click(screen.getByText('toggle'));

    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();
  });

  it('retires the message when a new attempt starts, even if it fails to quote', () => {
    const { rerender } = render(layout('settling'));

    rerender(layout('success'));

    deposit.isBusy = true;
    rerender(layout('success'));
    deposit.isBusy = false;
    deposit.preparationError = new Error('Jupiter build failed (400)');
    rerender(layout('success'));

    expect(screen.getByText('Jupiter build failed (400)')).toBeInTheDocument();
    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();
  });

  it('survives the busy flag settling after success and returns for the next run', () => {
    deposit.isBusy = true;
    const { rerender } = render(layout('settling'));

    rerender(layout('success'));
    deposit.isBusy = false;
    rerender(layout('success'));

    expect(screen.getByText(SUCCESS)).toBeInTheDocument();

    fireEvent.click(screen.getByText('edit amount'));

    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();

    rerender(layout('planning'));
    rerender(layout('success'));

    expect(screen.getByText(SUCCESS)).toBeInTheDocument();
    expect(onChangeAmount).toHaveBeenCalledTimes(2);
  });
});
