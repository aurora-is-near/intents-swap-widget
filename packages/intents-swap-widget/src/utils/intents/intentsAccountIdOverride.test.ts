import { getSupportedChains } from '../chains/getSupportedChains';
import { getIntentsAccountId } from './getIntentsAccountId';
import { getQuoteRecipient } from './getQuoteRecipient';
import { getQuoteRefundTo } from './getQuoteRefundTo';
import { getQuoteRefundType } from './getQuoteRefundType';

// A Solana wallet funding an EVM-keyed account: the wallet signs on-chain,
// the account receives on intents.
const WALLET = '7xKXtg2CW87d8V6zXKBq7cM8Y2FPHwzaAkxqEqD7x4rH';
const ACCOUNT = '0x1234567890123456789012345678901234567890';
const supportedChains = getSupportedChains({ walletAddress: WALLET });

const solOnChain = { isIntent: false, blockchain: 'sol' } as const;
const usdcIntents = { isIntent: true, blockchain: 'base' } as const;
const usdcBase = { isIntent: false, blockchain: 'base' } as const;

describe('intentsAccountId override', () => {
  it('credits the configured account for intents targets', () => {
    expect(
      getQuoteRecipient({
        walletAddress: WALLET,
        targetToken: usdcIntents,
        intentsAccountType: 'sol',
        intentsAccountId: ACCOUNT,
        defaultRecipient: undefined,
      }),
    ).toBe(ACCOUNT);

    // Without it the wallet's own account is credited.
    expect(
      getQuoteRecipient({
        walletAddress: WALLET,
        targetToken: usdcIntents,
        intentsAccountType: 'sol',
        defaultRecipient: undefined,
      }),
    ).toBe(getIntentsAccountId({ walletAddress: WALLET, addressType: 'sol' }));
  });

  it('leaves external recipients to the send address or the wallet', () => {
    expect(
      getQuoteRecipient({
        walletAddress: WALLET,
        sendAddress: '0xabc',
        targetToken: usdcBase,
        intentsAccountType: 'sol',
        intentsAccountId: ACCOUNT,
        defaultRecipient: undefined,
      }),
    ).toBe('0xabc');
  });

  it('refunds a supported-chain source to the wallet on its chain', () => {
    const args = {
      walletAddress: WALLET,
      sourceToken: solOnChain,
      targetToken: usdcIntents,
      intentsAccountType: 'sol',
      intentsAccountId: ACCOUNT,
      supportedChains,
    } as const;

    expect(getQuoteRefundTo({ ...args, defaultRefundTo: WALLET })).toBe(WALLET);
    expect(getQuoteRefundType(args)).toBe('ORIGIN_CHAIN');
  });

  it('refunds intents and unsupported sources to the configured account', () => {
    const intentsSource = {
      walletAddress: WALLET,
      sourceToken: usdcIntents,
      targetToken: usdcBase,
      intentsAccountType: 'sol',
      intentsAccountId: ACCOUNT,
      supportedChains,
    } as const;

    expect(
      getQuoteRefundTo({ ...intentsSource, defaultRefundTo: WALLET }),
    ).toBe(ACCOUNT);
    expect(getQuoteRefundType(intentsSource)).toBe('INTENTS');

    const unsupportedSource = {
      ...intentsSource,
      sourceToken: usdcBase,
      targetToken: usdcIntents,
    };

    expect(
      getQuoteRefundTo({ ...unsupportedSource, defaultRefundTo: WALLET }),
    ).toBe(ACCOUNT);
    expect(getQuoteRefundType(unsupportedSource)).toBe('INTENTS');
  });

  it('prefers the configured account for passkey refunds', () => {
    expect(
      getQuoteRefundTo({
        walletAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        sourceToken: usdcIntents,
        targetToken: usdcBase,
        intentsAccountType: 'webauthn',
        intentsAccountId: ACCOUNT,
        supportedChains: [],
        defaultRefundTo: '',
      }),
    ).toBe(ACCOUNT);
  });
});
