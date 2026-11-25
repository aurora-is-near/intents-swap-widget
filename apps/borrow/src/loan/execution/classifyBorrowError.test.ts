import {
  DepositTransferError,
  ExecutionCancelledError,
  ExecutionPollTimeoutError,
  type ExecutionRecovery,
  GuardError,
  IntentsConnectApiError,
  RunnerDisposedError,
} from '@aurora-is-near/intents-connect';
import { describe, expect, it } from 'vitest';

import { FAKE_BASE, pairSnapshot, usdc, weth } from '../../tests/fakeMarkets';
import {
  apiErrorMessage,
  BORROW_DELAYED_AFTER_MS,
  type BorrowErrorContext,
  type BorrowErrorKind,
  BorrowPreCheckError,
  borrowRecoveryAction,
  checkOriginGas,
  classifyBorrowError,
  diagnoseBorrowStep,
  isInsufficientFunds,
} from './classifyBorrowError';
import { BorrowPreviewError } from './preview';

const EIP1193_REJECTION = { code: 4001, message: 'User rejected the request.' };

const INSUFFICIENT_FUNDS = {
  code: -32000,
  message: 'insufficient funds for gas * price + value',
};

const transferRecovery = (cause: Error): ExecutionRecovery => ({
  kind: 'retry-transfer',
  executionId: 'exec-1',
  cause,
});

describe('classifyBorrowError', () => {
  it.each<
    [
      string,
      unknown,
      ExecutionRecovery | undefined,
      BorrowErrorContext,
      BorrowErrorKind,
    ]
  >([
    // rejected
    ['an EIP-1193 rejection', EIP1193_REJECTION, undefined, {}, 'rejected'],
    [
      'a rejection in prose',
      new Error('User denied transaction signature'),
      undefined,
      {},
      'rejected',
    ],
    [
      'a rejected deposit transfer',
      new DepositTransferError('exec-1', { cause: EIP1193_REJECTION }),
      transferRecovery(new Error('User rejected the request.')),
      {},
      'depositRejected',
    ],
    // busy
    [
      'the wallet-lock guard',
      new GuardError('EXECUTION_IN_FLIGHT', 'another execution is live', {
        executionId: 'exec-0',
      }),
      undefined,
      {},
      'busy',
    ],
    // noGas
    [
      'the gas pre-check',
      new BorrowPreCheckError('noGas', 'no gas'),
      undefined,
      {},
      'noGas',
    ],
    [
      "the wallet's insufficient funds",
      INSUFFICIENT_FUNDS,
      undefined,
      {},
      'noGas',
    ],
    [
      'a deposit transfer short of gas',
      new DepositTransferError('exec-1', {
        cause: { code: 'INSUFFICIENT_FUNDS', message: 'insufficient funds' },
      }),
      transferRecovery(new Error('insufficient funds for intrinsic gas')),
      {},
      'noGas',
    ],
    // quoteMoved: before anything was signed
    [
      'the QUOTE_MOVED guard',
      new GuardError('QUOTE_MOVED', 'quote moved'),
      undefined,
      {},
      'quoteMoved',
    ],
    [
      "the two-pass preview's moved quote",
      new BorrowPreviewError('quoteMoved', 'moved'),
      undefined,
      {},
      'quoteMoved',
    ],
    // priceMoved: the borrow step, after the collateral arrived
    [
      'a borrow step failed on price',
      new Error('execution OPERATION_FAILED'),
      undefined,
      { status: 'OPERATION_FAILED', borrowStep: 'priceMoved' },
      'priceMoved',
    ],
    // noLiquidity
    [
      'the liquidity pre-check',
      new BorrowPreCheckError('noLiquidity', 'no liquidity'),
      undefined,
      {},
      'noLiquidity',
    ],
    [
      'a borrow step failed on liquidity',
      new Error('execution OPERATION_FAILED'),
      undefined,
      { status: 'OPERATION_FAILED', borrowStep: 'noLiquidity' },
      'noLiquidity',
    ],
    // delayed
    [
      'a poll timeout',
      new ExecutionPollTimeoutError('exec-1', 'polling timed out'),
      undefined,
      {},
      'delayed',
    ],
    [
      'a borrow pending past the threshold',
      undefined,
      undefined,
      { pendingMs: BORROW_DELAYED_AFTER_MS + 1 },
      'delayed',
    ],
    // unknown
    [
      'a borrow pending under the threshold',
      undefined,
      undefined,
      { pendingMs: BORROW_DELAYED_AFTER_MS },
      'unknown',
    ],
    [
      'a borrow step failed for no known reason',
      new Error('execution OPERATION_FAILED'),
      undefined,
      { status: 'OPERATION_FAILED' },
      'unknown',
    ],
    [
      'an API error',
      new IntentsConnectApiError('bad request', 400),
      undefined,
      {},
      'unknown',
    ],
    [
      'another guard',
      new GuardError('FEE_NOT_ESTIMATED', 'no fee'),
      undefined,
      {},
      'unknown',
    ],
    [
      'a cancelled execution',
      new ExecutionCancelledError('exec-1'),
      undefined,
      {},
      'unknown',
    ],
    ['a plain error', new Error('boom'), undefined, {}, 'unknown'],
  ])('%s is %s', (_, error, recovery, context, kind) => {
    expect(classifyBorrowError(error, recovery, context)).toBe(kind);
  });

  it('takes a rejection over anything else it also says', () => {
    expect(
      classifyBorrowError(
        { ...EIP1193_REJECTION, cause: INSUFFICIENT_FUNDS },
        undefined,
      ),
    ).toBe('rejected');
  });
});

describe('classifyBorrowError: a pair the borrow action no longer covers', () => {
  it('is pairUnsupported when the steps-only retry refused the pair', () => {
    expect(
      classifyBorrowError(
        new BorrowPreviewError('pairUnsupported', 'gone'),
        undefined,
        { status: 'OPERATION_FAILED' },
      ),
    ).toBe('pairUnsupported');
  });

  it('is pairUnsupported when the borrow step failed on such a pair', () => {
    expect(
      classifyBorrowError(new Error('execution OPERATION_FAILED'), undefined, {
        status: 'OPERATION_FAILED',
        borrowStep: 'pairUnsupported',
      }),
    ).toBe('pairUnsupported');
  });

  it('offers to close, never to retry', () => {
    expect(borrowRecoveryAction('pairUnsupported', new Error('x'))).toBe(
      'close',
    );
  });
});

describe('isInsufficientFunds', () => {
  it.each([
    [{ name: 'InsufficientFundsError', message: 'x' }, true],
    [{ shortMessage: 'insufficient funds for transfer' }, true],
    [new Error('wrapped', { cause: INSUFFICIENT_FUNDS }), true],
    [
      {
        error: {
          message:
            'Attempt to debit an account but found no record of a prior credit.',
        },
      },
      true,
    ],
    [new Error('Transfer: insufficient lamports 10, need 20'), true],
    [new Error('execution reverted'), false],
    [undefined, false],
  ])('%o is %s', (value, expected) => {
    expect(isInsufficientFunds(value)).toBe(expected);
  });
});

describe('borrowRecoveryAction', () => {
  it.each<[BorrowErrorKind, string]>([
    ['rejected', 'retry'],
    ['depositRejected', 'retry'],
    ['cancelDeclined', 'retry'],
    ['busy', 'close'],
    ['noGas', 'retry'],
    ['quoteMoved', 'refresh'],
    ['priceMoved', 'refresh'],
    ['noLiquidity', 'close'],
    ['delayed', 'close'],
    ['unknown', 'retry'],
  ])('%s offers %s', (kind, action) => {
    expect(borrowRecoveryAction(kind, new Error('x'))).toBe(action);
  });

  it('offers to reconnect when the wallet left', () => {
    expect(
      borrowRecoveryAction(
        'unknown',
        new GuardError('WALLET_NOT_CONNECTED', 'gone'),
      ),
    ).toBe('reconnect');
    expect(borrowRecoveryAction('unknown', new RunnerDisposedError())).toBe(
      'reconnect',
    );
  });
});

describe('diagnoseBorrowStep', () => {
  /** 1 WETH at $3,000, max LTV 79%. */
  const input = (snapshot = pairSnapshot(FAKE_BASE)) => ({
    snapshot,
    collateral: weth(),
    borrow: usdc(),
    collateralAmount: 10n ** 18n,
    borrowAmount: 1_500_000_000n,
  });

  it('explains nothing while the market still lends it within the max LTV', () => {
    expect(diagnoseBorrowStep(input())).toBeUndefined();
  });

  it('is noLiquidity when the market can no longer lend the amount', () => {
    expect(
      diagnoseBorrowStep(
        input(
          pairSnapshot(FAKE_BASE, {
            borrowable: [usdc({ availableLiquidity: 1_000_000_000n })],
          }),
        ),
      ),
    ).toBe('noLiquidity');
  });

  it("is priceMoved when the collateral's price fell below the max LTV", () => {
    // $1,500 against $1,800 of WETH is 83%, above 79%.
    expect(
      diagnoseBorrowStep(
        input(
          pairSnapshot(FAKE_BASE, {
            collateral: [weth({ priceBase: 1_800n * 100_000_000n })],
          }),
        ),
      ),
    ).toBe('priceMoved');
  });
});

describe('diagnoseBorrowStep: a pair the borrow action no longer covers', () => {
  const input = (snapshot: ReturnType<typeof pairSnapshot>) => ({
    snapshot,
    collateral: weth(),
    borrow: usdc(),
    collateralAmount: 10n ** 18n,
    borrowAmount: 1_500_000_000n,
  });

  it('is pairUnsupported, not noLiquidity, for a coming-soon borrow token', () => {
    expect(
      diagnoseBorrowStep(
        input(
          pairSnapshot(FAKE_BASE, {
            borrowable: [
              usdc({ unavailable: true, unavailableReason: 'coming-soon' }),
            ],
          }),
        ),
      ),
    ).toBe('pairUnsupported');
  });

  it('is pairUnsupported for a coming-soon collateral', () => {
    expect(
      diagnoseBorrowStep(
        input(
          pairSnapshot(FAKE_BASE, {
            collateral: [
              weth({ unavailable: true, unavailableReason: 'coming-soon' }),
            ],
          }),
        ),
      ),
    ).toBe('pairUnsupported');
  });

  it('is still noLiquidity for a borrow token whose cap is reached', () => {
    expect(
      diagnoseBorrowStep(
        input(
          pairSnapshot(FAKE_BASE, {
            borrowable: [
              usdc({ unavailable: true, unavailableReason: 'cap-reached' }),
            ],
          }),
        ),
      ),
    ).toBe('noLiquidity');
  });
});

describe('checkOriginGas', () => {
  const USDC_ON_BASE =
    'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near';

  const ETH_ON_BASE = 'nep141:base.omft.near';

  const payUsdc = {
    assetId: USDC_ON_BASE,
    chain: 'base',
    contractAddress: '0x8335',
  };

  const payEth = { assetId: ETH_ON_BASE, chain: 'base' };

  it('skips the check while the balances are not read', () => {
    expect(
      checkOriginGas({ rows: undefined, origin: payUsdc, amount: 1n }),
    ).toBe('unknown');
  });

  it('is short when no gas token is held on the origin chain', () => {
    expect(
      checkOriginGas({
        rows: [{ assetId: USDC_ON_BASE, amount: 10n }],
        origin: payUsdc,
        amount: 10n,
      }),
    ).toBe('short');
  });

  it('is ok with some gas token held', () => {
    expect(
      checkOriginGas({
        rows: [
          { assetId: USDC_ON_BASE, amount: 10n },
          { assetId: ETH_ON_BASE, amount: 1n },
        ],
        origin: payUsdc,
        amount: 10n,
      }),
    ).toBe('ok');
  });

  it('is short when paying with the whole gas token balance', () => {
    const rows = [{ assetId: ETH_ON_BASE, amount: 100n }];

    expect(checkOriginGas({ rows, origin: payEth, amount: 100n })).toBe(
      'short',
    );
    expect(checkOriginGas({ rows, origin: payEth, amount: 99n })).toBe('ok');
  });

  it("can't tell for a token not bridged as an omft asset", () => {
    expect(
      checkOriginGas({
        rows: [{ assetId: 'nep141:wrap.near', amount: 10n }],
        origin: { assetId: 'nep141:wrap.near', chain: 'near' },
        amount: 10n,
      }),
    ).toBe('unknown');
  });
});

describe('apiErrorMessage', () => {
  const apiError = (body: unknown) =>
    new IntentsConnectApiError('Intents Connect API error', 400, body);

  it("reads the API's error reason", () => {
    expect(apiErrorMessage(apiError({ error: 'No liquidity available' }))).toBe(
      'No liquidity available',
    );
  });

  it('reads it through a wrapping error', () => {
    expect(
      apiErrorMessage(
        new Error('wrapped', {
          cause: apiError({ error: 'No liquidity available' }),
        }),
      ),
    ).toBe('No liquidity available');
  });

  it.each([
    ['a non-JSON body', '<html>502 Bad Gateway</html>'],
    ['no body', undefined],
    ['no error field', { message: 'nope' }],
    ['an empty error', { error: '  ' }],
    ['a non-string error', { error: 42 }],
  ])('is undefined for %s', (_, body) => {
    expect(apiErrorMessage(apiError(body))).toBeUndefined();
  });

  it('is undefined for an error that is not from the API', () => {
    expect(
      apiErrorMessage(new Error('No liquidity available')),
    ).toBeUndefined();
    expect(apiErrorMessage(undefined)).toBeUndefined();
  });

  it('cuts a very long reason', () => {
    const reason = apiErrorMessage(apiError({ error: 'x'.repeat(1000) }));

    expect(reason).toHaveLength(301);
    expect(reason?.endsWith('…')).toBe(true);
  });
});
