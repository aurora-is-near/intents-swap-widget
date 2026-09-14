import { base58 } from '@scure/base';
import { failGuard } from '@/errors';
import {
  BACKEND_PLACEHOLDERS,
  type SolanaArg,
  type SolanaStep,
} from '@/types/execution';

const hex = /^(?:[0-9a-fA-F]{2})*$/;
const { intermediary } = BACKEND_PLACEHOLDERS;

const legal = (condition: boolean, message: string) => {
  if (!condition) {
    failGuard('ILLEGAL_STEP_SHAPE', message);
  }
};

const isAddress = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) {
    return false;
  }

  try {
    return base58.decode(value).length === 32;
  } catch {
    return false;
  }
};

const keysAreLegal = (value: object, keys: string[]) =>
  legal(
    Object.keys(value).every((key) => keys.includes(key)),
    'Unknown Solana instruction field',
  );

const validateArg = (arg: SolanaArg) => {
  legal(!!arg && typeof arg === 'object', 'Invalid Solana argument');
  keysAreLegal(arg, ['name', 'type', 'value']);
  legal(typeof arg.name === 'string', 'Solana arguments require a name');

  const integer = /^(u8|u16|u32|u64|u128|i8|i16|i32|i64)$/.exec(arg.type);

  if (integer) {
    if (arg.type === 'u64' && arg.value === BACKEND_PLACEHOLDERS.minAmountOut) {
      return;
    }

    legal(
      (typeof arg.value === 'number' && Number.isSafeInteger(arg.value)) ||
        (typeof arg.value === 'string' && /^-?[0-9]+$/.test(arg.value)),
      'Solana integer arguments require an exact integer (use decimal strings for large values)',
    );
    const value = BigInt(arg.value);
    const bits = BigInt(arg.type.slice(1));
    const signed = arg.type.startsWith('i');
    const limit = 2n ** (signed ? bits - 1n : bits);

    legal(
      value >= (signed ? -limit : 0n) && value < limit,
      `${arg.type} argument is out of range`,
    );
  } else if (arg.type === 'bool') {
    legal(typeof arg.value === 'boolean', 'Invalid bool argument');
  } else if (arg.type === 'pubkey') {
    legal(
      arg.value === intermediary || isAddress(arg.value),
      'Invalid pubkey argument',
    );
  } else if (arg.type === 'bytes') {
    legal(
      typeof arg.value === 'string' && hex.test(arg.value),
      'Bytes arguments must be hex without 0x',
    );
  } else if (arg.type === 'string') {
    legal(typeof arg.value === 'string', 'Invalid string argument');
  } else {
    failGuard('ILLEGAL_STEP_SHAPE', 'Unsupported Solana argument type');
  }
};

/** Validates the bridge-in instruction shape without changing account or table order. */
export const solanaStepsAreLegal = (
  steps: SolanaStep[],
  addressLookupTables: string[] = [],
) => {
  legal(
    addressLookupTables.length <= 16 && addressLookupTables.every(isAddress),
    'Solana allows at most 16 valid lookup table addresses',
  );
  legal(steps.length <= 50, 'Solana allows at most 50 steps');
  legal(
    new TextEncoder().encode(JSON.stringify({ steps, addressLookupTables }))
      .length <=
      256 * 1024,
    'Solana step payload exceeds 256 KiB',
  );

  steps.forEach((step) => {
    legal(!!step && typeof step === 'object', 'Invalid Solana instruction');
    keysAreLegal(step, [
      'programId',
      'discriminator',
      'args',
      'accounts',
      'metadata',
    ]);
    legal(
      isAddress(step.programId),
      'Solana programId must be a base58 address',
    );
    legal(
      step.programId !== 'ComputeBudget111111111111111111111111111111',
      'Connect supplies compute-budget instructions',
    );
    legal(
      step.discriminator === undefined ||
        (typeof step.discriminator === 'string' &&
          hex.test(step.discriminator)),
      'Solana discriminator must be hex without 0x',
    );
    legal(Array.isArray(step.args), 'Solana args must be an array');
    step.args.forEach(validateArg);
    legal(
      Array.isArray(step.accounts) && step.accounts.length > 0,
      'Solana instructions require accounts',
    );
    step.accounts.forEach((account) => {
      legal(!!account && typeof account === 'object', 'Invalid Solana account');
      keysAreLegal(account, ['pubkey', 'isSigner', 'isWritable']);
      legal(
        account.pubkey === intermediary || isAddress(account.pubkey),
        'Invalid Solana account address',
      );
      legal(
        typeof account.isSigner === 'boolean' &&
          typeof account.isWritable === 'boolean',
        'Solana account flags must be boolean',
      );
      legal(
        !account.isSigner || account.pubkey === intermediary,
        'Only {INTERMEDIARY} may sign Solana instructions',
      );
    });
  });
};
