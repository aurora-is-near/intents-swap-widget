import type { RecipientCheck } from './recipient';

/**
 * The New loan form's call to action (Web-Borrow.dc.html line 1578), one
 * state at a time. `ready` carries what its label needs: "Borrow 1,234 USDC
 * on Aave". Until Borrow execution, `ready` still leaves the button disabled
 * (decided in the plan review).
 */
export type CtaState =
  | { kind: 'connect' }
  | { kind: 'enterAmount' }
  | { kind: 'insufficientBalance' }
  | { kind: 'ltvTooHigh' }
  | { kind: 'enterRecipient' }
  | {
      kind: 'ready';
      /** In borrow-token units. */
      borrowAmount: bigint;
      decimals: number;
      symbol: string;
      marketName: string;
    };

export type CtaInput = {
  connected: boolean;
  /** The collateral amount entered, in token units; `0n` when blank. */
  amount: bigint;
  /** The funding asset's wallet balance, in the same units. */
  balance: bigint;
  /** The borrow amount `loanFigures` gives, in borrow-token units. */
  borrowAmount: bigint;
  borrow: { symbol: string; decimals: number };
  /** The selection `marketFit` gives; `undefined` when no market fits. */
  market: { name: string } | undefined;
  /** "Send borrowed funds to another wallet" is ticked. */
  sendToOther: boolean;
  recipient: RecipientCheck;
};

/**
 * The first state that applies, in this order: connect, enter an amount,
 * insufficient balance, LTV too high, enter a recipient, ready. An amount
 * that borrows nothing (LTV 0, or too small to make one unit) asks for an
 * amount. A ticked recipient box with an empty or invalid address asks for
 * one; the field itself says which.
 */
export const ctaState = ({
  connected,
  amount,
  balance,
  borrowAmount,
  borrow,
  market,
  sendToOther,
  recipient,
}: CtaInput): CtaState => {
  if (!connected) {
    return { kind: 'connect' };
  }

  if (amount <= 0n || borrowAmount <= 0n) {
    return { kind: 'enterAmount' };
  }

  if (amount > balance) {
    return { kind: 'insufficientBalance' };
  }

  if (!market) {
    return { kind: 'ltvTooHigh' };
  }

  if (sendToOther && recipient.status !== 'valid') {
    return { kind: 'enterRecipient' };
  }

  return {
    kind: 'ready',
    borrowAmount,
    decimals: borrow.decimals,
    symbol: borrow.symbol,
    marketName: market.name,
  };
};
