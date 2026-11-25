import {
  AAVE_BORROW_INTENT,
  AAVE_BORROW_MARKETS,
  AAVE_MARKET_NAME,
  type AaveBorrowAsset,
  type AaveBorrowChain,
  type AaveBorrowMarket,
  type AaveBorrowToken,
  type AaveCollateralAsset,
} from './constants';

/**
 * The TypeScript twin of `actions/aave-v3-borrow-v1/script.star`: the same
 * inputs, tables, output and messages. No SDK dependency: the Borrow app's
 * recipe wraps the step builder with real values.
 */

/** The backend's placeholders, substituted when the execution is created. */
export const INTERMEDIARY = '{INTERMEDIARY}';
export const MIN_AMOUNT_OUT = '{MIN_AMOUNT_OUT}';

/** As the bundled actions word it: the API reads 0 bps as 100 bps. */
export const ZERO_SLIPPAGE_ERROR =
  'Execution creation treats 0 bps as 100 bps (1%). Enter a positive slippage tolerance.';

/** Aave's referral code: none. */
const NO_REFERRAL = '0';

/** Aave's variable interest rate mode (stable is gone from V3.2). */
const VARIABLE_RATE_MODE = '2';

/**
 * The inputs once the definition's schema has validated them and applied
 * its defaults (`slippageTolerance`, `dry`, `publicKey`).
 */
export type AaveBorrowInputs = {
  chain: AaveBorrowChain;
  borrowAsset: AaveBorrowAsset;
  collateral: AaveCollateralAsset;
  /** Borrow-token atomic units, a literal. */
  borrowAmount: string;
  recipient: string;
  /** Origin units with `originAsset`, collateral units without. */
  amount: string;
  /** Present: bridge in from it. Absent: the collateral is already there. */
  originAsset?: string;
  slippageTolerance: number;
  deadline?: string;
  dry: boolean;
  publicKey: string;
};

export type ActionStep = {
  to: string;
  functionSignature: string;
  parameters: string[];
  value: string;
  metadata: { name: string; description: string };
};

export type ExecutionMetadata = { intent: string; title: string };

/** For `POST /api/v1/executions/{wallet}`: bridge in, then the steps. */
export type BridgeInExecution = {
  version: '1.0';
  type: 'evm';
  outOperation: false;
  dry: boolean;
  metadata: ExecutionMetadata;
  quote: {
    originAsset: string;
    destinationAsset: string;
    amount: string;
    swapType: 'EXACT_INPUT';
    slippageTolerance: number;
    deadline?: string;
  };
  steps: ActionStep[];
  publicKey?: string;
};

/**
 * For `POST /api/v1/executions/{wallet}/steps`: the steps spend collateral
 * the intermediary already holds. That endpoint's body has no
 * `outOperation`, so it is left out.
 */
export type StepsOnlyExecution = {
  version: '1.0';
  type: 'evm';
  destinationAsset: string;
  dry: boolean;
  metadata: ExecutionMetadata;
  steps: ActionStep[];
  publicKey?: string;
};

export type AaveBorrowExecution = BridgeInExecution | StepsOnlyExecution;

export type AaveBorrowResolution =
  | { execution: AaveBorrowExecution }
  | { error: string };

export type AaveBorrowPair = {
  market: AaveBorrowMarket;
  collateral: AaveBorrowToken;
  borrow: AaveBorrowToken;
};

const available = (table: Readonly<Partial<Record<string, unknown>>>) =>
  Object.keys(table).join(', ');

/**
 * The chain's market and the two tokens, or the caller-facing reason one of
 * them is not in that chain's tables.
 */
export const lookupAaveBorrowPair = (
  chain: AaveBorrowChain,
  collateral: AaveCollateralAsset,
  borrowAsset: AaveBorrowAsset,
): AaveBorrowPair | { error: string } => {
  // Own keys only: the schema bounds `chain`, but a TS caller may not have
  // run it.
  const market = Object.hasOwn(AAVE_BORROW_MARKETS, chain)
    ? AAVE_BORROW_MARKETS[chain]
    : undefined;

  if (!market) {
    return { error: `Aave V3 is not available on ${chain}.` };
  }

  const borrow = market.borrow[borrowAsset];

  if (!borrow) {
    return {
      error: `${borrowAsset} cannot be borrowed on ${market.chainLabel}. Choose one of: ${available(market.borrow)}.`,
    };
  }

  const supplied = market.collateral[collateral];

  if (!supplied) {
    return {
      error: `${collateral} cannot be supplied as collateral on ${market.chainLabel}. Choose one of: ${available(market.collateral)}.`,
    };
  }

  return { market, collateral: supplied, borrow };
};

/** As the Borrow app titles the recipe (`loan/execution/recipe.ts`). */
export const aaveBorrowTitle = ({
  market,
  collateral,
  borrow,
}: AaveBorrowPair): string =>
  `Borrow ${borrow.label} against ${collateral.label} on ${AAVE_MARKET_NAME} ${market.chainLabel}`;

export type AaveBorrowStepsInput = {
  chain: AaveBorrowChain;
  collateral: AaveCollateralAsset;
  borrowAsset: AaveBorrowAsset;
  /** Opaque: `{MIN_AMOUNT_OUT}` on bridge-in, a literal otherwise. */
  collateralAmount: string;
  /** Borrow-token atomic units, a literal. */
  borrowAmount: string;
  /** Who holds the position and runs the steps: the intermediary. */
  owner: string;
  recipient: string;
};

const supplySteps = (
  { market, collateral }: AaveBorrowPair,
  amount: string,
  owner: string,
): ActionStep[] => {
  if (collateral.native) {
    // The gateway wraps what it is sent and supplies it for `owner`. Its
    // first argument is ignored by current gateways but still in the
    // signature.
    return [
      {
        to: market.gateway,
        functionSignature: 'depositETH(address,address,uint16)',
        parameters: [market.pool, owner, NO_REFERRAL],
        value: amount,
        metadata: {
          name: `Supply ${collateral.label}`,
          description: `Supply ${collateral.label} to Aave V3 as collateral through the WETH gateway`,
        },
      },
    ];
  }

  return [
    {
      to: collateral.address,
      functionSignature: 'approve(address,uint256)',
      parameters: [market.pool, amount],
      value: '0',
      metadata: {
        name: `Approve ${collateral.label}`,
        description: `Allow the Aave V3 Pool to take the ${collateral.label} collateral`,
      },
    },
    {
      to: market.pool,
      functionSignature: 'supply(address,uint256,address,uint16)',
      parameters: [collateral.address, amount, owner, NO_REFERRAL],
      value: '0',
      metadata: {
        name: `Supply ${collateral.label}`,
        description: `Supply ${collateral.label} to Aave V3 as collateral`,
      },
    },
  ];
};

const stepsOf = (
  pair: AaveBorrowPair,
  {
    collateralAmount,
    borrowAmount,
    owner,
    recipient,
  }: Pick<
    AaveBorrowStepsInput,
    'collateralAmount' | 'borrowAmount' | 'owner' | 'recipient'
  >,
): ActionStep[] => {
  const { market, borrow } = pair;

  return [
    ...supplySteps(pair, collateralAmount, owner),
    {
      to: market.pool,
      functionSignature: 'borrow(address,uint256,uint256,uint16,address)',
      parameters: [
        borrow.address,
        borrowAmount,
        VARIABLE_RATE_MODE,
        NO_REFERRAL,
        owner,
      ],
      value: '0',
      metadata: {
        name: `Borrow ${borrow.label}`,
        description: `Borrow ${borrow.label} from Aave V3 at the variable rate against the collateral`,
      },
    },
    {
      to: borrow.address,
      functionSignature: 'transfer(address,uint256)',
      parameters: [recipient, borrowAmount],
      value: '0',
      metadata: {
        name: `Send ${borrow.label}`,
        description: `Send the borrowed ${borrow.label} to the recipient`,
      },
    },
  ];
};

/**
 * Supply the collateral for `owner`, borrow `borrowAmount` at the variable
 * rate on `owner`'s account, and send it to `recipient`, each step with
 * metadata. `aaveBorrowRecipe` (`sdk.ts`), the Borrow app's Aave borrow
 * recipe, builds its steps with it from real values. `owner` must
 * be the account running the steps (the intermediary): Aave lets an account
 * borrow only against its own collateral unless credit is delegated.
 *
 * Throws when the chain lacks either symbol: callers map a reserve to a
 * table entry first (`lookupAaveBorrowPair`).
 */
export const buildAaveBorrowSteps = (
  input: AaveBorrowStepsInput,
): ActionStep[] => {
  const pair = lookupAaveBorrowPair(
    input.chain,
    input.collateral,
    input.borrowAsset,
  );

  if ('error' in pair) {
    throw new Error(`aave-v3-borrow: ${pair.error}`);
  }

  return stepsOf(pair, input);
};

/**
 * The action's `resolve(inputs)`: the execution creation body, or a
 * caller-facing error. With `originAsset` the body bridges into the
 * collateral and supplies the guaranteed output (`{MIN_AMOUNT_OUT}`);
 * without it, the steps supply `amount` the intermediary already holds.
 */
export const resolveAaveBorrow = (
  inputs: AaveBorrowInputs,
): AaveBorrowResolution => {
  const pair = lookupAaveBorrowPair(
    inputs.chain,
    inputs.collateral,
    inputs.borrowAsset,
  );

  if ('error' in pair) {
    return pair;
  }

  const bridgeIn = inputs.originAsset !== undefined;

  if (bridgeIn && inputs.slippageTolerance === 0) {
    return { error: ZERO_SLIPPAGE_ERROR };
  }

  const metadata = { intent: AAVE_BORROW_INTENT, title: aaveBorrowTitle(pair) };
  const steps = stepsOf(pair, {
    collateralAmount: bridgeIn ? MIN_AMOUNT_OUT : inputs.amount,
    borrowAmount: inputs.borrowAmount,
    owner: INTERMEDIARY,
    recipient: inputs.recipient,
  });

  const publicKey = inputs.publicKey ? { publicKey: inputs.publicKey } : {};

  if (inputs.originAsset === undefined) {
    return {
      execution: {
        version: '1.0',
        type: 'evm',
        destinationAsset: pair.collateral.assetId,
        dry: inputs.dry,
        metadata,
        steps,
        ...publicKey,
      },
    };
  }

  return {
    execution: {
      version: '1.0',
      type: 'evm',
      outOperation: false,
      dry: inputs.dry,
      metadata,
      quote: {
        originAsset: inputs.originAsset,
        destinationAsset: pair.collateral.assetId,
        amount: inputs.amount,
        swapType: 'EXACT_INPUT',
        slippageTolerance: inputs.slippageTolerance,
        ...(inputs.deadline !== undefined && { deadline: inputs.deadline }),
      },
      steps,
      ...publicKey,
    },
  };
};
