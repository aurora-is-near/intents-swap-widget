/**
 * Pure per-standard signing: material in, wire-encoded signature out.
 *
 * This layer knows nothing about Intents Connect or 1Click payload shapes, so
 * both stacks can share it. The widget's `src/utils/intents/signers/*` files
 * are intended to collapse into thin adapters over these functions.
 */
export * from '@/signers/standards/encoding';
export { signErc191, type Erc191SignArgs } from '@/signers/standards/erc191';
export {
  signRawEd25519,
  type RawEd25519SignArgs,
} from '@/signers/standards/rawEd25519';
export {
  signNep413,
  type Nep413Payload,
  type Nep413SignArgs,
} from '@/signers/standards/nep413';
export { signSep53, type Sep53SignArgs } from '@/signers/standards/sep53';
export { signTip191, type Tip191SignArgs } from '@/signers/standards/tip191';
export {
  signTonConnect,
  type TonConnectSignArgs,
} from '@/signers/standards/tonConnect';
