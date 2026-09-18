import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ChangeEvent, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';
import type { StepsPreview } from '@aurora-is-near/intents-connect';

import { SpendRow } from './SpendRow';
import { BUY_TOKENS, SOLANA_USDC } from '../constants';
import type { SolanaSpendQuote } from '../spend';

// The widget package's dependency chain does not resolve under vitest, and
// this test is about SpendRow's own logic, so its primitives are stand-ins.
vi.mock('@aurora-is-near/intents-swap-widget', () => ({
  Button: ({
    children,
    onClick,
    state,
  }: {
    children: ReactNode;
    onClick?: () => void;
    state?: string;
  }) => (
    <button
      type="button"
      disabled={state === 'disabled' || state === 'loading'}
      onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: ReactNode }) => <li>{children}</li>,
  Banner: ({ message }: { message: string }) => <div>{message}</div>,
  Input: ({
    id,
    defaultValue,
    onChange,
  }: {
    id: string;
    defaultValue: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  }) => <input id={id} defaultValue={defaultValue} onChange={onChange} />,
  TinyNumber: ({ value }: { value: string }) => <span>{value}</span>,
}));

const exec = (overrides: Partial<UseExecutionResult> = {}) =>
  ({
    phase: 'idle',
    isBusy: false,
    isCancelling: false,
    hasSubmittedSignature: false,
    cancel: vi.fn(),
    ...overrides,
  }) as UseExecutionResult;

const quote = (): SolanaSpendQuote => ({
  preview: {} as StepsPreview,
  receive: '10000000',
  minimumReceive: '9950000',
  networkFee: '100000',
  expiresAt: Date.now() + 30_000,
});

const baseProps = {
  isLocked: false,
  isBusy: false,
  exec: exec(),
  quoteMoved: false,
  isCommitted: false,
  recipient: '',
  onRecipientChange: vi.fn(),
  onOpen: vi.fn(),
  onClose: vi.fn(),
  onExecute: vi.fn(),
};

afterEach(cleanup);

describe('SpendRow', () => {
  it('offers Sell on a bought token and opens on click', () => {
    const onOpen = vi.fn();

    render(
      <SpendRow
        {...baseProps}
        token={{ ...BUY_TOKENS[0]!, amount: '5000000' }}
        kind="sell"
        isActive={false}
        onOpen={onOpen}
      />,
    );

    expect(screen.getByText('ORCA')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sell' }));

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('disables the action while another row or the buy card is busy', () => {
    render(
      <SpendRow
        {...baseProps}
        token={{ ...SOLANA_USDC, amount: '5000000' }}
        kind="withdraw"
        isActive={false}
        isLocked
      />,
    );

    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
  });

  it('shows the quote figures and the confirm label once previewed', () => {
    render(
      <SpendRow
        {...baseProps}
        token={{ ...BUY_TOKENS[0]!, amount: '5000000' }}
        kind="sell"
        isActive
        quote={quote()}
      />,
    );

    expect(screen.getByText('Estimated USDC')).toBeInTheDocument();
    expect(screen.getByText('Minimum USDC')).toBeInTheDocument();
    expect(screen.getByText('Connect network fee')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm sell' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('asks for a quote first and validates the withdrawal recipient', () => {
    const { rerender } = render(
      <SpendRow
        {...baseProps}
        token={{ ...SOLANA_USDC, amount: '5000000' }}
        kind="withdraw"
        isActive
        recipient="not-an-address"
      />,
    );

    expect(screen.getByLabelText('Send USDC to')).toBeInTheDocument();
    expect(
      screen.getByText('Enter a Solana wallet address'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get quote' })).toBeDisabled();

    rerender(
      <SpendRow
        {...baseProps}
        token={{ ...SOLANA_USDC, amount: '5000000' }}
        kind="withdraw"
        isActive
        recipient="4nn959rPTCxboxXKUxZwMq4knJMKPURA4WciuJyrDAvQ"
      />,
    );

    expect(
      screen.queryByText('Enter a Solana wallet address'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get quote' })).toBeEnabled();
  });

  it('shows progress while busy and the error banner afterwards', () => {
    const { rerender } = render(
      <SpendRow
        {...baseProps}
        token={{ ...BUY_TOKENS[0]!, amount: '5000000' }}
        kind="sell"
        isActive
        isBusy
        exec={exec({ phase: 'awaiting-signature', status: 'CREATED' })}
      />,
    );

    expect(screen.getByText('Awaiting signature')).toBeInTheDocument();
    expect(screen.getByText('Execution created')).toBeInTheDocument();

    rerender(
      <SpendRow
        {...baseProps}
        token={{ ...BUY_TOKENS[0]!, amount: '5000000' }}
        kind="sell"
        isActive
        error={new Error('Jupiter build failed')}
      />,
    );

    expect(screen.getByText('Jupiter build failed')).toBeInTheDocument();
  });

  it('offers Cancel for a real create that failed before signing, whatever its status', () => {
    const { rerender } = render(
      <SpendRow
        {...baseProps}
        token={{ ...BUY_TOKENS[0]!, amount: '5000000' }}
        kind="sell"
        isActive
        exec={exec({
          phase: 'failed',
          status: 'OPERATION_PENDING',
          executionId: 'steps-1',
        })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();

    // Once signed, the execution is the service's to finish — no Cancel.
    rerender(
      <SpendRow
        {...baseProps}
        token={{ ...BUY_TOKENS[0]!, amount: '5000000' }}
        kind="sell"
        isActive
        exec={exec({
          phase: 'failed',
          status: 'OPERATION_FAILED',
          executionId: 'steps-1',
          hasSubmittedSignature: true,
        })}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument();
  });

  it('shows an unavailable fee and any quote warning', () => {
    render(
      <SpendRow
        {...baseProps}
        token={{ ...SOLANA_USDC, amount: '5000000' }}
        kind="withdraw"
        isActive
        recipient="4nn959rPTCxboxXKUxZwMq4knJMKPURA4WciuJyrDAvQ"
        quote={{
          ...quote(),
          networkFee: undefined,
          warning: 'The recipient has no USDC account yet.',
        }}
      />,
    );

    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('The recipient has no USDC account yet.'),
    ).toBeInTheDocument();
  });

  it('reports success with the explorer link', () => {
    render(
      <SpendRow
        {...baseProps}
        token={{ ...BUY_TOKENS[0]!, amount: '5000000' }}
        kind="sell"
        isActive
        exec={exec({
          phase: 'success',
          status: 'SUCCESS',
          execution: {
            transaction: { solanaTxHash: 'abc' },
          } as UseExecutionResult['execution'],
        })}
      />,
    );

    expect(
      screen.getByText('Sold ORCA for USDC in your Connect account'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View Solana transaction' }),
    ).toHaveAttribute('href', 'https://explorer.solana.com/tx/abc');
  });
});
