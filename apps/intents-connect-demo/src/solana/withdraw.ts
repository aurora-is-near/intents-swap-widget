import { PublicKey } from '@solana/web3.js';
import type { Connection } from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import type { SolanaRecipe, StepsPlan } from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';
import {
  createSolanaRecipientAta,
  prepareSolanaSteps,
} from '@aurora-is-near/intents-connect-wallet/solana';

import {
  PREVIEW_VALIDITY_MS,
  SOLANA_USDC,
  WITHDRAW_RESERVE_BPS,
} from './constants';
import type { SolanaSpendQuote } from './spend';

export type SolanaWithdrawParams = { recipient: string };

/**
 * A recipient must be a wallet: a 32-byte, on-curve public key. Token
 * accounts and other PDAs are off-curve, and sending USDC to one of those
 * — or to a mistyped string — would strand it.
 */
export const parseSolanaRecipient = (value: string): PublicKey => {
  const trimmed = value.trim();

  try {
    const key = new PublicKey(trimmed);

    if (PublicKey.isOnCurve(key.toBytes())) {
      return key;
    }
  } catch {
    // Fall through to the single message below.
  }

  throw new Error('Enter a Solana wallet address');
};

/**
 * Moves USDC out of the Connect account to `recipient`. The fee is charged in
 * the same USDC, so the SDK measures it first and transfers `amount - fee`.
 */
export const buildSolanaWithdrawPlan = ({
  amount,
  recipient,
}: {
  /** Atomic USDC balance to withdraw — the fee is deducted from it. */
  amount: string;
  recipient: string;
}): StepsPlan<SolanaWithdrawParams> => {
  const recipientKey = parseSolanaRecipient(recipient);
  const mint = new PublicKey(SOLANA_USDC.mint);
  const recipe: SolanaRecipe<SolanaWithdrawParams> = {
    id: 'solana-withdraw-usdc',
    intent: 'solana_withdraw_usdc',
    title: 'Withdraw USDC from your Connect account',
    type: 'solana',
    flow: 'steps-only',
    destination: {
      chain: 'sol',
      assetId: SOLANA_USDC.assetId,
      tokenAddress: SOLANA_USDC.mint,
    },
    buildSteps: ({ intermediary, amount: transfer }) => {
      const owner = new PublicKey(intermediary);
      const source = getAssociatedTokenAddressSync(mint, owner, true);
      const destination = createSolanaRecipientAta({
        intermediary,
        recipient: recipientKey.toBase58(),
        mint: SOLANA_USDC.mint,
      });

      return prepareSolanaSteps(
        [
          destination.instruction,
          createTransferCheckedInstruction(
            source,
            mint,
            new PublicKey(destination.address),
            owner,
            BigInt(transfer),
            SOLANA_USDC.decimals,
          ),
        ],
        { intermediary },
      );
    },
  };

  return {
    recipe,
    params: { recipient: recipientKey.toBase58() },
    amount,
    feeFromAmount: { amountReserveBps: WITHDRAW_RESERVE_BPS },
    previewTtlMs: PREVIEW_VALIDITY_MS,
  };
};

/**
 * Whether `recipient` already has a USDC token account. Creating one costs
 * rent, and the idempotent create in the steps names the Connect account as
 * its payer — surfaced as a warning rather than a refusal, because whether
 * the relayer covers that rent is a deployment property the demo cannot see.
 */
export const hasUsdcAccount = async (
  connection: Connection,
  recipient: string,
): Promise<boolean> => {
  const ata = getAssociatedTokenAddressSync(
    new PublicKey(SOLANA_USDC.mint),
    parseSolanaRecipient(recipient),
  );

  const [account] = await connection.getMultipleAccountsInfo([ata]);

  return account != null;
};

export const previewSolanaWithdraw = async (
  exec: Pick<UseExecutionResult, 'previewSteps'>,
  plan: StepsPlan<SolanaWithdrawParams>,
  connection: Connection,
): Promise<SolanaSpendQuote<SolanaWithdrawParams>> => {
  const [preview, recipientHasAccount] = await Promise.all([
    exec.previewSteps(plan),
    hasUsdcAccount(connection, plan.params.recipient),
  ]);

  return {
    preview,
    receive: preview.spendable,
    minimumReceive: preview.spendable,
    networkFee: preview.networkFee,
    warning: recipientHasAccount
      ? undefined
      : 'The recipient has no USDC account yet. Creating it costs rent, paid by your Connect account, so the withdrawal can fail if that account holds no SOL.',
    expiresAt: Date.parse(preview.plan.prepared!.expiresAt),
  };
};
