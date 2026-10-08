/* eslint-disable import/order */

// Mock the network boundary first: it breaks the config ↔ network import cycle.
import '../../../tests/mock-axios-requests';

import { createHash } from 'crypto';
import { p256 } from '@noble/curves/p256';
import { base58, base64urlnopad } from '@scure/base';

import { getWebAuthnIntentsAccountId } from '../getWebAuthnIntentsAccountId';
import { IntentSignerWebAuthn } from './webauthn';

const sha256 = (data: Uint8Array) =>
  new Uint8Array(createHash('sha256').update(data).digest());

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;

  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });

  return out;
};

const toBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/** A software passkey that produces assertions the way an authenticator does. */
const createSoftwarePasskey = () => {
  const privateKey = p256.utils.randomPrivateKey();
  // Uncompressed point without the 0x04 prefix: x ‖ y.
  const point = p256.getPublicKey(privateKey, false).slice(1);
  const publicKey = `p256:${base58.encode(point)}`;
  const challenges: Uint8Array[] = [];

  const signChallenge = async (challenge: Uint8Array) => {
    challenges.push(challenge);

    const clientDataJSON = new TextEncoder().encode(
      JSON.stringify({
        type: 'webauthn.get',
        challenge: base64urlnopad.encode(challenge),
        origin: 'chrome-extension://test',
      }),
    );

    // rpIdHash ‖ flags (UP|UV) ‖ signCount
    const authenticatorData = concat(
      sha256(new TextEncoder().encode('test')),
      new Uint8Array([0x05, 0, 0, 0, 0]),
    );

    const signed = concat(authenticatorData, sha256(clientDataJSON));
    const signature = p256
      .sign(sha256(signed), privateKey, { lowS: false })
      .toDERRawBytes();

    return {
      clientDataJSON: toBuffer(clientDataJSON),
      authenticatorData: toBuffer(authenticatorData),
      signature: toBuffer(signature),
      userHandle: null,
    } as unknown as AuthenticatorAssertionResponse;
  };

  return { publicKey, point, challenges, signChallenge };
};

const PAYLOAD = JSON.stringify({
  signer_id: 'placeholder',
  verifying_contract: 'intents.near',
  deadline: '2030-01-01T00:00:00.000Z',
  nonce: 'AAAA',
  intents: [],
});

describe('IntentSignerWebAuthn', () => {
  it('signs sha256(payload) and returns a webauthn multipayload the contract can verify', async () => {
    const passkey = createSoftwarePasskey();
    const walletAddress = getWebAuthnIntentsAccountId(passkey.publicKey);
    const signer = new IntentSignerWebAuthn({ walletAddress }, passkey);

    const signed = await signer.signIntent({
      standard: 'webauthn',
      payload: PAYLOAD,
    });

    expect(passkey.challenges).toEqual([
      sha256(new TextEncoder().encode(PAYLOAD)),
    ]);

    if (signed.standard !== 'webauthn') {
      throw new Error('Expected a webauthn payload');
    }

    expect(signed.payload).toBe(PAYLOAD);
    expect(signed.public_key).toBe(passkey.publicKey);
    expect(signed.signature).toMatch(/^p256:/);

    // Verify like the contract: raw r‖s over sha256(authData ‖ sha256(clientData)).
    const rawSignature = base58.decode(signed.signature.slice('p256:'.length));
    const authenticatorData = base64urlnopad.decode(signed.authenticator_data);
    const clientData = new TextEncoder().encode(signed.client_data_json);
    const digest = sha256(concat(authenticatorData, sha256(clientData)));

    expect(rawSignature).toHaveLength(64);
    expect(
      p256.verify(
        rawSignature,
        digest,
        concat(new Uint8Array([4]), passkey.point),
      ),
    ).toBe(true);
  });

  it('rejects payloads for other standards', async () => {
    const passkey = createSoftwarePasskey();
    const signer = new IntentSignerWebAuthn(
      { walletAddress: getWebAuthnIntentsAccountId(passkey.publicKey) },
      passkey,
    );

    await expect(
      signer.signIntent({ standard: 'erc191', payload: PAYLOAD }),
    ).rejects.toThrow('Passkey signer cannot sign erc191 payload');
    expect(passkey.challenges).toHaveLength(0);
  });

  it('rejects a passkey that does not belong to the account', async () => {
    const passkey = createSoftwarePasskey();
    const other = createSoftwarePasskey();
    const signer = new IntentSignerWebAuthn(
      { walletAddress: getWebAuthnIntentsAccountId(other.publicKey) },
      passkey,
    );

    await expect(
      signer.signIntent({ standard: 'webauthn', payload: PAYLOAD }),
    ).rejects.toThrow('Passkey does not match the widget account');
    expect(passkey.challenges).toHaveLength(0);
  });
});
