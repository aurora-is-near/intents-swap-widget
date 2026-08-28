import { describe, expect, it } from 'vitest';

import { isUserRejection, toError } from '@/errors';

describe('isUserRejection', () => {
  it('reads the EIP-1193 code, however it is nested', () => {
    expect(isUserRejection({ code: 4001 })).toBe(true);
    expect(isUserRejection({ error: { code: 4001 } })).toBe(true);
    expect(
      isUserRejection(Object.assign(new Error('x'), { cause: { code: 4001 } })),
    ).toBe(true);
  });

  it('falls back to prose for providers that report no code', () => {
    // The wordings wallets actually use. `declined` is Freighter's, and
    // `closed` is how several connectors report a dismissed popup — both were
    // missing while the widget's isUserDeniedSigning already matched them.
    [
      'User rejected the request.',
      'User denied transaction signature',
      'User cancelled',
      'User canceled the request',
      'User declined access',
      'User closed the popup',
    ].forEach((message) => {
      expect(isUserRejection(new Error(message))).toBe(true);
    });
  });

  it('reads the prose off an in-band rejection carried on cause', () => {
    // Freighter rejects IN-BAND: sep53 rethrows the bare string through
    // toError, so the only evidence left is the cause.
    expect(isUserRejection(toError('User declined access'))).toBe(true);
  });

  it('does not classify unrelated failures as rejections', () => {
    expect(isUserRejection(new Error('insufficient funds'))).toBe(false);
    expect(isUserRejection({ code: -32000 })).toBe(false);
    expect(isUserRejection(undefined)).toBe(false);
  });
});
