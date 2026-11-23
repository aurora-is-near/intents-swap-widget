/**
 * @jest-environment node
 */
import { base58 } from '@scure/base';
import { KeyPair } from 'near-api-js';
import {
  quoteHash,
  QuoteRequest,
  type QuoteResponse,
} from '@defuse-protocol/one-click-sdk-typescript';

import { isQuoteSignatureValid } from './isQuoteSignatureValid';

const keyPair = KeyPair.fromRandom('ed25519');
const publicKey = keyPair.getPublicKey().toString();

const sign = (response: QuoteResponse): QuoteResponse => ({
  ...response,
  signature: `ed25519:${base58.encode(
    keyPair.sign(new TextEncoder().encode(quoteHash(response))).signature,
  )}`,
});

const quoteRequest = {
  dry: false,
  swapType: QuoteRequest.swapType.EXACT_INPUT,
  slippageTolerance: 100,
  originAsset: 'nep141:wrap.near',
  depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
  destinationAsset: 'nep141:usdt.tether-token.near',
  amount: '1000000000000000000000000',
  refundTo: 'alice.near',
  refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
  recipient: 'alice.near',
  recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
  deadline: '2026-11-23T12:00:00.000Z',
  appFees: [{ recipient: 'fees.near', fee: 10 }],
} satisfies QuoteRequest;

const signedResponse = sign({
  correlationId: 'test-correlation-id',
  timestamp: '2026-11-23T11:00:00.000Z',
  signature: '',
  quoteRequest,
  quote: {
    amountIn: '1000000000000000000000000',
    amountInFormatted: '1',
    amountInUsd: '3.00',
    minAmountIn: '1000000000000000000000000',
    amountOut: '3000000',
    amountOutFormatted: '3',
    amountOutUsd: '3.00',
    minAmountOut: '2970000',
    depositAddress: 'deposit.near',
    deadline: '2026-11-23T12:00:00.000Z',
    timeWhenInactive: '2026-11-23T12:00:00.000Z',
    timeEstimate: 30,
  },
});

describe('isQuoteSignatureValid', () => {
  it('accepts a quote signed by the 1Click key', () => {
    expect(isQuoteSignatureValid(quoteRequest, signedResponse, publicKey)).toBe(
      true,
    );
  });

  it('rejects a quote whose deposit address was changed', () => {
    const tampered = {
      ...signedResponse,
      quote: { ...signedResponse.quote, depositAddress: 'attacker.near' },
    };

    expect(isQuoteSignatureValid(quoteRequest, tampered, publicKey)).toBe(
      false,
    );
  });

  it('rejects a quote with its signature removed', () => {
    expect(
      isQuoteSignatureValid(
        quoteRequest,
        { ...signedResponse, signature: '' },
        publicKey,
      ),
    ).toBe(false);
  });

  it('ignores fields 1Click does not sign, such as app fees', () => {
    const withOtherFees = {
      ...signedResponse,
      quoteRequest: { ...quoteRequest, appFees: [] },
    };

    expect(isQuoteSignatureValid(quoteRequest, withOtherFees, publicKey)).toBe(
      true,
    );
  });

  it.each([
    ['recipient', { recipient: 'bob.near' }],
    ['amount', { amount: '1' }],
    ['destination asset', { destinationAsset: 'nep141:wrap.near' }],
    ['deadline', { deadline: '2026-11-23T13:00:00.000Z' }],
  ])('rejects a genuine quote signed for another %s', (_, requestOverrides) => {
    expect(
      isQuoteSignatureValid(
        { ...quoteRequest, ...requestOverrides },
        signedResponse,
        publicKey,
      ),
    ).toBe(false);
  });

  it('accepts the same deadline written another way', () => {
    expect(
      isQuoteSignatureValid(
        { ...quoteRequest, deadline: '2026-11-23T12:00:00Z' },
        signedResponse,
        publicKey,
      ),
    ).toBe(true);
  });

  it('accepts optional fields 1Click echoes back as null', () => {
    const withNulls = sign({
      ...signedResponse,
      quoteRequest: {
        ...quoteRequest,
        customRecipientMsg: null as unknown as undefined,
      },
    });

    expect(isQuoteSignatureValid(quoteRequest, withNulls, publicKey)).toBe(
      true,
    );
  });

  it('rejects a quote signed by another key', () => {
    expect(isQuoteSignatureValid(quoteRequest, signedResponse)).toBe(false);
  });

  it.each([
    ['origin', { ...quoteRequest, originAsset: 'aurora:btc' }],
    ['destination', { ...quoteRequest, destinationAsset: 'AURORA:XMR' }],
  ])('skips a two-leg quote by its %s asset', (_, request) => {
    expect(
      isQuoteSignatureValid(
        request,
        { ...signedResponse, signature: '' },
        publicKey,
      ),
    ).toBe(true);
  });
});
