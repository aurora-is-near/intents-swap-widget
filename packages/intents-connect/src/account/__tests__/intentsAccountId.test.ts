import { describe, expect, it } from 'vitest';

import {
  getFamilyForStandard,
  getIntentsAccountId,
  getWalletIntentsAccountId,
} from '@/account';

const SOL = 'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq';
// hex(base58.decode(SOL)) — the same derivation the widget uses.
const SOL_HEX =
  'b0f1d91026713c55f826f58f9ea778b4b8967efefc5aaebd8d09b33a0d228dbe';

describe('getIntentsAccountId', () => {
  it('lower-cases an EVM address', () => {
    expect(
      getIntentsAccountId({
        family: 'evm',
        address: '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464',
      }),
    ).toBe('0xca67c1bb3fd69857e5edaf6aa1c65371bf46a464');
  });

  it('rejects a malformed EVM address', () => {
    expect(getIntentsAccountId({ family: 'evm', address: '0x12' })).toBe(
      undefined,
    );
  });

  it('lower-cases a NEAR account id', () => {
    expect(getIntentsAccountId({ family: 'near', address: 'Alice.near' })).toBe(
      'alice.near',
    );
  });

  it('accepts an implicit NEAR account', () => {
    const implicit = 'a'.repeat(64);

    expect(getIntentsAccountId({ family: 'near', address: implicit })).toBe(
      implicit,
    );
  });

  it('rejects an invalid NEAR account id', () => {
    expect(getIntentsAccountId({ family: 'near', address: 'bad..near' })).toBe(
      undefined,
    );
  });

  it('hex-encodes a Solana public key', () => {
    expect(getIntentsAccountId({ family: 'sol', address: SOL })).toBe(SOL_HEX);
  });

  it('rejects a 0x address passed as Solana', () => {
    expect(
      getIntentsAccountId({
        family: 'sol',
        address: '0xca67c1bb3fd69857e5edaf6aa1c65371bf46a464',
      }),
    ).toBe(undefined);
  });

  it('returns undefined without an address', () => {
    expect(getIntentsAccountId({ family: 'evm', address: undefined })).toBe(
      undefined,
    );
  });
});

describe('getWalletIntentsAccountId', () => {
  it('maps the signing standard to a family', () => {
    expect(getFamilyForStandard('erc191')).toBe('evm');
    expect(getFamilyForStandard('raw_ed25519')).toBe('sol');
    expect(getFamilyForStandard('nep413')).toBe('near');
    expect(getFamilyForStandard('sep53')).toBe('stellar');
    expect(getFamilyForStandard('tip191')).toBe(undefined);
  });

  it('derives from a connected wallet', () => {
    expect(
      getWalletIntentsAccountId({
        signingStandard: 'nep413',
        getAddress: () => 'Bob.near',
      }),
    ).toBe('bob.near');
  });

  it('is undefined while disconnected or for an unsupported standard', () => {
    expect(
      getWalletIntentsAccountId({
        signingStandard: 'erc191',
        getAddress: () => undefined,
      }),
    ).toBe(undefined);
    expect(
      getWalletIntentsAccountId({
        // Not signable here yet: no family.
        signingStandard: 'tip191' as never,
        getAddress: () => 'TABC',
      }),
    ).toBe(undefined);
    expect(getWalletIntentsAccountId(null)).toBe(undefined);
  });
});

describe('Stellar', () => {
  const ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
  const KEY =
    '8a88e3dd7409f195fd52db2d3cba5d72ca6709bf1d94121bf3748801b40f6f5c';

  it('derives the hex of the public key the G-address encodes', () => {
    expect(getIntentsAccountId({ family: 'stellar', address: ADDRESS })).toBe(
      KEY,
    );
    expect(
      getWalletIntentsAccountId({
        signingStandard: 'sep53',
        getAddress: () => ADDRESS,
      }),
    ).toBe(KEY);
  });

  it('refuses a malformed address or a bad checksum', () => {
    expect(getIntentsAccountId({ family: 'stellar', address: 'GABC' })).toBe(
      undefined,
    );
    expect(
      getIntentsAccountId({
        family: 'stellar',
        address: `${ADDRESS.slice(0, -1)}A`,
      }),
    ).toBe(undefined);
    // A secret seed (S…) is not an account id.
    expect(
      getIntentsAccountId({
        family: 'stellar',
        address: 'SBCQUX3GUSB4ZKLTRWALQCEFSOXAX5R7IP2X3OUJ5D2CJWEO3S3YSULU',
      }),
    ).toBe(undefined);
  });
});
