import type {
  BalanceToken,
  ExecutionPlan,
  StepsPlan,
} from '@aurora-is-near/intents-connect';

/** A position the dApp takes the funds into, e.g. an Aave reserve. */
export type SupplyOption = {
  /** Unique within the destination. */
  id: string;
  symbol: string;
  /** Chain slug of the token the bridge delivers, e.g. `base`. */
  chain: string;
  /**
   * The ERC-20 the bridge delivers. Unset: the chain's native token, which
   * the dApp's steps wrap (Aave's WrappedTokenGatewayV3, say).
   */
  tokenAddress?: string;
  decimals: number;
  /** Yearly yield as a fraction: 0.034 is 3.4%. */
  apy?: number;
  /** Why it can't take funds now. Listed, but can't be chosen. */
  unavailable?: string;
};

/** What the dApp builds an execution plan from. */
export type SupplyInput = {
  option: SupplyOption;
  /** The 1Click asset id of `option`'s token. */
  destinationAsset: string;
  /** The token the user pays with. */
  origin: BalanceToken;
  /** Of `origin`, in its smallest unit. */
  amount: string;
};

/** Funds already waiting at the user's intermediary, to spend in place. */
export type WaitingInput = {
  option: SupplyOption;
  /** The 1Click asset id of `option`'s token: the fee is charged in it. */
  destinationAsset: string;
  /** What waits, in the token's smallest unit. */
  amount: string;
};

export type SupplyDestination = {
  /** Where the supply lands, e.g. "Aave Core V3 · Ethereum". */
  title: string;
  /** False: the dApp is on a market Intents Connect can't supply to. */
  supported: boolean;
  /** Shown when unsupported: what the user can do instead. */
  hint?: string;
  /**
   * What the user can supply into. Undefined while the dApp loads them;
   * those Intents Connect can't deliver are left out.
   */
  options?: readonly SupplyOption[];
  /** The options couldn't be loaded. */
  optionsError?: Error;
  /**
   * The plan for one supply. Leave `quote.deadline` unset: the quote is
   * refreshed, and each refresh stamps its own.
   */
  buildPlan: (input: SupplyInput) => ExecutionPlan;
  /**
   * The same supply as a steps-only plan, spending funds already waiting at
   * the user's intermediary: a supply whose last step failed leaves them
   * there. Optional: without it the modal only says where they are.
   */
  buildStepsPlan?: (input: WaitingInput) => StepsPlan;
};
