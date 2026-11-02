import type {
  IntentsRail,
  SwapQuote,
  SwapQuoteResponse,
  SwapStatus,
} from '@/intentsApi/types';
import type { RecipeDestination } from '@/types/recipe';

/** Where the funds come from: public or confidential intents balances. */
export type FundingSource = 'intents' | 'confidential';

export const FUNDING_RAIL: Readonly<Record<FundingSource, IntentsRail>> = {
  intents: 'INTENTS',
  confidential: 'CONFIDENTIAL_INTENTS',
};

/** What to move to the intermediary. */
export type FundingRequest = {
  source: FundingSource;
  /** Token id on intents.near — the 1Click origin asset. */
  originAsset: string;
  /** Smallest unit, sent exactly (`EXACT_INPUT`). */
  amount: string;
  /** What the intermediary receives: a recipe's destination. EVM chains only. */
  destination: RecipeDestination;
  /** Basis points. Defaults to 100 (1%). */
  slippageTolerance?: number;
  /** How long the quote stays fundable, in milliseconds. Defaults to 15 min. */
  deadlineMs?: number;
  /**
   * JSON-safe data kept with the record and handed back for the next leg —
   * e.g. who the steps act for. Stored in the funding store, so no secrets.
   */
  context?: Record<string, unknown>;
};

/**
 * Persisted progress of one funding:
 *
 * - `quoted`: nothing moved; the transfer can be signed while the quote lives.
 * - `submitting`: the signed transfer is being submitted — outcome unknown
 *   until 1Click reports, so it is never re-signed.
 * - `submitted` → `settled` (1Click succeeded) → `arrived` (seen at the
 *   intermediary): ready for the next leg.
 * - `supplying` → `done`: the next leg runs / ran.
 * - `refunded`, `failed`, `abandoned` (expired unfunded): terminal.
 */
export type FundingRecordStage =
  | 'quoted'
  | 'submitting'
  | 'submitted'
  | 'settled'
  | 'arrived'
  | 'supplying'
  | 'done'
  | 'refunded'
  | 'failed'
  | 'abandoned';

export const TERMINAL_FUNDING_STAGES: readonly FundingRecordStage[] = [
  'done',
  'refunded',
  'failed',
  'abandoned',
];

export type FundingRecord = {
  v: 1;
  /** The quote's deposit address — unique per funding. */
  id: string;
  intentsAccountId: string;
  /** The wallet address the intermediary belongs to. */
  walletAddress: string;
  source: FundingSource;
  originAsset: string;
  /** Smallest unit of `originAsset`. */
  amountIn: string;
  destination: RecipeDestination;
  /** The intermediary (EVM) the swap pays out to. */
  recipient: string;
  depositAddress: string;
  depositMemo?: string;
  quote: Pick<
    SwapQuote,
    | 'amountOut'
    | 'minAmountOut'
    | 'deadline'
    | 'timeWhenInactive'
    | 'timeEstimate'
    | 'withdrawFee'
  >;
  correlationId: string;
  /** The recipient's balance of the destination token before the swap. */
  baselineBalance?: string;
  stage: FundingRecordStage;
  intentHash?: string;
  status?: SwapStatus;
  /** Delivered amount, when 1Click reports it (not for confidential settlement). */
  amountOut?: string;
  refundedAmount?: string;
  /** The recipient's balance once the funds were seen there. */
  arrivedBalance?: string;
  /** The execution that spends the funds (the next leg). */
  stepsExecutionId?: string;
  /** Why it failed, for support. */
  error?: string;
  context?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

/** What is happening right now, including stages that are not persisted. */
export type FundingPhase =
  | 'resolving'
  | 'quoting'
  | 'awaiting-signature'
  | 'submitting'
  | 'bridging'
  | 'awaiting-arrival';

export type FundingEvent =
  | { type: 'phase'; phase: FundingPhase }
  | { type: 'quoted'; quote: SwapQuoteResponse }
  | { type: 'record'; record: FundingRecord }
  | { type: 'status'; status: SwapStatus };
