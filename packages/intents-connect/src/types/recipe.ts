import type {
  Chain,
  FlowShape,
  PreparedSteps,
  SolanaStep,
  Step,
} from '@/types/execution';

/**
 * Context handed to a step builder.
 *
 * For EVM builders, `amount` is OPAQUE — either a literal atomic string or the
 * `{MIN_AMOUNT_OUT}` placeholder. A recipe must template it without inspecting
 * it; that single discipline is what lets one builder serve both fee
 * strategies. Solana builders always receive a literal atomic string.
 */
export type StepContext = {
  /** Where the steps execute and where bridged funds land. */
  intermediary: string;
  /** The connected wallet — use this when a receipt should be user-owned. */
  userAddress: string;
  amount: string;
};

export type RecipeDestination = {
  chain: Chain;
  /**
   * 1Click asset id, e.g. `nep141:base-0x…omft.near`. On a `steps-only`
   * recipe it is sent as `destinationAsset` — the token the fee is charged in.
   */
  assetId: string;
  /**
   * Destination token contract. Undefined means the chain's native asset, which
   * is exempt from the destination-token guard.
   */
  tokenAddress?: string;
};

/** The only per-integration surface. */
export type Recipe<TParams = void> = {
  id: string;
  /** Echoed into `metadata.intent`. */
  intent: string;
  /** Echoed into `metadata.title`. */
  title: string;
  flow: FlowShape;
  type: 'evm';
  destination: RecipeDestination;
  buildSteps: (ctx: StepContext, params: TParams) => Step[];
};

/** Solana builders receive a concrete amount, suitable for opaque instruction data. */
export type SolanaRecipe<TParams = void> = Omit<
  Recipe<TParams>,
  'type' | 'buildSteps'
> & {
  type: 'solana';
  buildSteps: (
    ctx: StepContext,
    params: TParams,
  ) => PreparedSteps<SolanaStep> | Promise<PreparedSteps<SolanaStep>>;
};

export type AnyRecipe<TParams = void> = Recipe<TParams> | SolanaRecipe<TParams>;
