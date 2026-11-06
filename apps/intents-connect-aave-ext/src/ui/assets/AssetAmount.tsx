import { ChainIcon } from './ChainIcon';
import { TokenLogo } from './TokenLogo';
import { chainLabel } from './tokens';

/**
 * "[icon] 0.03 SOL": an amount with its token's icon, for summary rows.
 * Leave `amount` out to show the token alone; `lead` goes before the
 * number ("at least").
 */
export const AssetAmount = ({
  symbol,
  amount,
  lead,
}: {
  symbol: string;
  amount?: string;
  lead?: string;
}) => (
  <span className="inline-flex min-w-0 items-center gap-1.5">
    <TokenLogo symbol={symbol} size={16} />
    <span className="truncate">
      {lead ? `${lead} ` : null}
      {amount ? `${amount} ` : null}
      {symbol}
    </span>
  </span>
);

/** "[icon] Solana": a network with its icon. */
export const ChainName = ({
  chain,
  label,
}: {
  chain: string;
  /** Instead of the chain's own name, e.g. an exchange's "(ERC-20)" one. */
  label?: string;
}) => (
  <span className="inline-flex min-w-0 items-center gap-1.5">
    <ChainIcon chain={chain} />
    <span className="truncate">{label ?? chainLabel(chain)}</span>
  </span>
);
