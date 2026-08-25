import { Memo, StrKey } from '@stellar/stellar-sdk';

/**
 * Builds the memo a Stellar deposit must carry.
 *
 * Stellar 1Click uses a SHARED deposit address, so this memo is the only thing
 * attributing the payment to an execution — omit it and the deposit is lost.
 */
export const createMemo = (memoString: string): Memo => {
  if (!memoString) {
    return Memo.none();
  }

  // 1. A numeric id.
  if (/^\d+$/.test(memoString)) {
    return Memo.id(memoString);
  }

  // 2. A standard text memo (28 bytes or fewer).
  if (new TextEncoder().encode(memoString).length <= 28) {
    return Memo.text(memoString);
  }

  // 3. A lowercase Stellar public key (56 chars starting with `g`). Upper-case
  //    it to decode, then use the 32 raw bytes as a MemoHash. Hex-encoded
  //    rather than wrapped in Buffer: `Memo.hash` accepts hex directly, and a
  //    bare `Buffer.from` relies on a Node global browser bundles lack.
  if (/^g[0-7a-z]{55}$/.test(memoString)) {
    const bytes = StrKey.decodeEd25519PublicKey(memoString.toUpperCase());
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');

    return Memo.hash(hex);
  }

  // 4. A 64-character hex string.
  if (/^[0-9a-fA-F]{64}$/.test(memoString)) {
    return Memo.hash(memoString);
  }

  throw new Error(`Unsupported Stellar memo format: ${memoString}`);
};
