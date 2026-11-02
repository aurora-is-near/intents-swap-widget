import {
  ASSET_ICONS,
  CHAIN_ICONS,
  Icon,
  TOKENS_DATA,
} from '@aurora-is-near/intents-swap-widget';
import type { Chains, Token } from '@aurora-is-near/intents-swap-widget';

import { chainLabel } from './summary';

const ICON = 16;

/** The same icon the widget's TokenIcon picks for a token. */
const tokenIcon = (token: Token) => {
  const symbol = token.symbol.toLowerCase();

  return ASSET_ICONS[symbol] ?? TOKENS_DATA[symbol]?.icon ?? token.icon;
};

const Inline = ({
  icon,
  label,
  radius,
}: {
  icon: Parameters<typeof Icon>[0]['icon'];
  label: string;
  radius?: number;
}) => (
  <span className="inline-flex items-center gap-sw-xs whitespace-nowrap align-[-3px] text-sw-gray-50">
    <Icon icon={icon} label={label} size={ICON} radius={radius} />
    {label}
  </span>
);

/** `[icon] 1 USDC` inside a sentence; `isEstimate` prefixes `≈`. */
export const InlineAmount = ({
  amount,
  token,
  isEstimate = false,
}: {
  amount: string;
  token: Token;
  isEstimate?: boolean;
}) => {
  const inline = (
    <Inline
      icon={tokenIcon(token)}
      label={`${amount} ${token.symbol}`.trim()}
    />
  );

  // Kept together so `≈` never wraps away from its amount.
  return isEstimate ? (
    <span className="whitespace-nowrap">≈ {inline}</span>
  ) : (
    inline
  );
};

/** `[icon] Avalanche` inside a sentence. */
export const InlineChain = ({ chain }: { chain: Chains }) => (
  <Inline icon={CHAIN_ICONS[chain]} label={chainLabel(chain)} radius={4} />
);
