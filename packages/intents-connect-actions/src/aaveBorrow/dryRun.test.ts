import { describe, expect, it } from 'vitest';

import {
  AAVE_BORROW_CHAINS,
  AAVE_BORROW_MARKETS,
  type AaveBorrowAsset,
  type AaveBorrowChain,
  type AaveCollateralAsset,
} from './constants';
import { resolveAaveBorrow } from './resolve';

/**
 * Live check against the Intents Connect API: for every chain and collateral
 * in the tables, a dry bridge-in execution must come back with a quote. It
 * also proves each collateral's 1Click asset id. Runs only with
 * `INTENTS_CONNECT_API_KEY` in the environment (never printed or stored).
 */

const API_URL =
  process.env.INTENTS_CONNECT_API_URL ??
  'https://intents-connect-api.aurora.dev';

/**
 * Any ordinary EVM address: a dry run creates nothing for it. It is also the
 * quote's refund address, so not a burn address such as `0x…dEaD`, which the
 * API refuses as `refundTo`.
 */
const PLACEHOLDER_WALLET = '0x1111111111111111111111111111111111111111';

/** 100 USDC, bridged in from the other chain's native USDC. */
const ORIGIN_AMOUNT = '100000000';

const otherChain = (chain: AaveBorrowChain): AaveBorrowChain =>
  chain === 'base' ? 'arb' : 'base';

const cases = AAVE_BORROW_CHAINS.flatMap((chain) =>
  (
    Object.keys(AAVE_BORROW_MARKETS[chain].collateral) as AaveCollateralAsset[]
  ).map((collateral) => ({ chain, collateral })),
);

describe.skipIf(!process.env.INTENTS_CONNECT_API_KEY)(
  'aave-v3-borrow dry run against the Intents Connect API',
  () => {
    it.each(cases)(
      'quotes $collateral on $chain',
      async ({ chain, collateral }) => {
        const origin = AAVE_BORROW_MARKETS[otherChain(chain)].borrow.USDC;
        const borrowAsset: AaveBorrowAsset = 'USDC';

        if (!origin) {
          throw new Error('The origin chain has no USDC entry');
        }

        const resolution = resolveAaveBorrow({
          chain,
          borrowAsset,
          collateral,
          borrowAmount: '1000000',
          recipient: PLACEHOLDER_WALLET,
          amount: ORIGIN_AMOUNT,
          originAsset: origin.assetId,
          slippageTolerance: 100,
          dry: true,
          publicKey: '',
        });

        if ('error' in resolution) {
          throw new Error(
            `The action rejected the inputs: ${resolution.error}`,
          );
        }

        const response = await fetch(
          `${API_URL}/api/v1/executions/${PLACEHOLDER_WALLET}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.INTENTS_CONNECT_API_KEY ?? '',
            },
            body: JSON.stringify(resolution.execution),
          },
        );

        type DryRunBody = {
          result?: {
            quote?: {
              minAmountOut?: string;
              destinationAsset?: string;
              amountIn?: string;
              amountOut?: string;
            };
            details?: { networkFee?: string };
          };
          error?: string;
        };

        // A gateway may answer with an HTML or plain-text page: parse safely.
        const text = await response.text();
        let body: DryRunBody = {};

        try {
          body = JSON.parse(text) as DryRunBody;
        } catch {
          // Keep {}: the status below still names the entry.
        }

        // The response holds no key. Paste this output into the PR.
        process.stdout.write(
          `${JSON.stringify({
            chain,
            collateral,
            status: response.status,
            quote: body.result?.quote,
            networkFee: body.result?.details?.networkFee,
            error: body.error,
          })}\n`,
        );

        // Only the status and the API's own error text: never the request headers.
        expect(
          response.ok,
          `${chain}/${collateral}: HTTP ${response.status} ${(body.error ?? '').slice(0, 200)}`,
        ).toBe(true);
        expect(body.result?.quote?.destinationAsset).toBe(
          AAVE_BORROW_MARKETS[chain].collateral[collateral]?.assetId,
        );
        expect(BigInt(body.result?.quote?.minAmountOut ?? '0')).toBeGreaterThan(
          0n,
        );
      },
      60_000,
    );
  },
);
