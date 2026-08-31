import type { Chain, ExecutionType, FlowShape, Step } from '@/types/execution';

/**
 * Context handed to a step builder.
 *
 * `amount` is OPAQUE — either a literal atomic string or the
 * `{MIN_AMOUNT_OUT}` placeholder. A recipe must template it without inspecting
 * it; that single discipline is what lets one builder serve both fee
 * strategies.
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
  /** 1Click asset id, e.g. `nep141:base-0x…omft.near`. */
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
  type: ExecutionType;
  destination: RecipeDestination;
  buildSteps: (ctx: StepContext, params: TParams) => Step[];
};
