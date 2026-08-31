import type { Recipe, Step } from '@aurora-is-near/intents-connect';

import type { DestinationToken } from '../shared/config';

export const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';

/** The user's Polymarket account — a proxy contract, not the wallet they sign with. */
export type PolymarketParams = { account: string };

/**
 * Polygon USDC, from the service catalogue rather than derived.
 *
 * Two traps here. The id uses the `nep245` HOT-omni scheme, NOT the
 * `nep141:<chain>-<token>.omft.near` form the Hydrex integration uses — so it
 * cannot be constructed by analogy. And Polygon has two USDCs; the catalogue
 * entry and the only liquid pUSD pool both point at the native one, while the
 * bridged USDC.e pools sit empty.
 */
export const POL_USDC_ASSET =
  'nep245:v2_1.omni.hot.tg:137_qiStmoQJDQPTebaPjgx5VBxZv6L';

export const USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
export const PUSD = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB';

export const DEST_TOKEN: DestinationToken = { symbol: 'USDC', decimals: 6 };

/** pUSD is 6-decimal, same as USDC — the pool sits at tick 0, ≈1:1. */
export const PUSD_DECIMALS = 6;

const SWAP_ROUTER = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';

/**
 * SwapRouter02's variant, which has NO deadline field — the SwapRouter01
 * signature that does is not deployed at that address. Getting this wrong
 * fails on-chain, not in review: the service ABI-encodes whatever it is given.
 */
const EXACT_INPUT_SINGLE =
  'exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))';

/** 0.01%. The only USDC/pUSD tier carrying real liquidity. */
const POOL_FEE = '100';

export const polymarketDepositRecipe: Recipe<PolymarketParams> = {
  id: 'polymarket-deposit',
  intent: 'polymarket_deposit',
  title: 'Polymarket deposit',
  flow: 'bridge-in',
  type: 'evm',
  // Unlike Hydrex this destination is a token, not the chain's native asset,
  // so `destinationTokenIsTouched` actually bites — the approve below is the
  // step that satisfies it, because its `to` IS this address.
  destination: { chain: 'pol', assetId: POL_USDC_ASSET, tokenAddress: USDC },
  buildSteps: ({ amount }, { account }): Step[] => [
    {
      to: USDC,
      functionSignature: 'approve(address,uint256)',
      parameters: [SWAP_ROUTER, amount],
      value: '0',
    },
    {
      // The swap pays out straight to the Polymarket account, and it has to:
      // under the placeholder fee strategy `amount` is the literal
      // `{MIN_AMOUNT_OUT}`, so the swap's OUTPUT is unknowable here and a
      // separate pUSD transfer step could not name an amount to send. Paying
      // the recipient directly also leaves no dust at the intermediary.
      to: SWAP_ROUTER,
      functionSignature: EXACT_INPUT_SINGLE,
      parameters: [
        [
          USDC,
          PUSD,
          POOL_FEE,
          account,
          amount,
          '0', // amountOutMinimum — no slippage bound (demo)
          '0', // sqrtPriceLimitX96 — unbounded
        ],
      ],
      value: '0',
    },
  ],
};
