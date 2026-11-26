import type {
  Execution,
  ExecutionPlan,
  ExecutionPreview,
} from '@aurora-is-near/intents-connect';

/**
 * Dry runs for the borrow execution tests, shaped as the Intents Connect
 * runner's `preview()` returns them.
 */

type DryQuote = Partial<
  Pick<Execution['quote'], 'amountIn' | 'amountOut' | 'minAmountOut'>
>;

/** 0.01 WETH: the fee the service reports by default. */
const DRY_NETWORK_FEE = '10000000000000000';

/**
 * A dry bridge-in response into WETH, paid with 3,000 USDC. Pass
 * `{ networkFee: undefined }` for a failed fee estimate.
 */
export const dryExecution = (
  quote: DryQuote = {},
  { networkFee }: { networkFee: string | undefined } = {
    networkFee: DRY_NETWORK_FEE,
  },
): Execution => ({
  id: '',
  status: 'CREATED',
  quote: {
    amount: quote.amountIn ?? '3000000000',
    amountIn: quote.amountIn ?? '3000000000',
    amountOut: quote.amountOut ?? '995000000000000000',
    minAmountOut: quote.minAmountOut ?? '990000000000000000',
    depositAddress: '',
    depositMemo: null,
  },
  details: {
    intermediaryAddress: '0x00000000000000000000000000000000000000aa',
    networkFee,
  },
  steps: [],
  type: 'evm',
});

/** What `preview(plan)` resolves to: the plan back, with steps prepared. */
export const dryPreview = <TParams>(
  plan: ExecutionPlan<TParams>,
  execution: Execution = dryExecution(),
): ExecutionPreview<TParams> => ({
  execution,
  plan: {
    ...plan,
    prepared: {
      steps: [],
      walletAddress: '0x00000000000000000000000000000000000000cc',
      intermediary: execution.details.intermediaryAddress,
      quote: plan.quote,
    },
  },
});
