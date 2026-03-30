import { ASSET_ICONS } from '@aurora-is-near/intents-swap-widget';
import { useEffect, useState } from 'react';

import { ToggleOnly } from '../../uikit/Toggle';
import { TokenTag } from '../../uikit/TokenTag';
import { TokenType } from '../../hooks/useTokens';

interface TokenRowProps {
  token: TokenType;
  isSelected: boolean;
  onToggle: () => void;
  isDisabled?: boolean;
}

export function TokenRow({
  token,
  isSelected,
  onToggle,
  isDisabled = false,
}: TokenRowProps) {
  const [isTokenIconBroken, setIsTokenIconBroken] = useState(false);

  useEffect(() => {
    setIsTokenIconBroken(false);
  }, [token.icon]);

  const isWrappedNear = token.symbol.toLowerCase() === 'wnear';
  const assetIconKey = isWrappedNear ? 'near' : token.symbol.toLowerCase();
  let tokenIcon = ASSET_ICONS[assetIconKey] ?? undefined;

  if (token.icon && !isTokenIconBroken) {
    tokenIcon = (
      <img
        src={token.icon}
        alt={token.symbol}
        className="size-full rounded-full"
        onError={() => setIsTokenIconBroken(true)}
      />
    );
  }

  const tokenSymbol = isWrappedNear ? 'NEAR' : token.symbol;

  return (
    <div
      className={`flex items-center justify-between px-csw-md py-csw-sm bg-csw-gray-900 rounded-csw-md transition-colors ${
        isDisabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-csw-gray-800 transition-colors cursor-pointer'
      }`}
      onClick={() => !isDisabled && onToggle()}>
      <TokenTag
        tokenIcon={tokenIcon}
        tokenSymbol={tokenSymbol}
        className="flex-1 justify-start bg-transparent"
      />

      {/* Toggle Switch */}
      <ToggleOnly
        size="sm"
        isEnabled={isSelected}
        onChange={() => !isDisabled && onToggle()}
      />
    </div>
  );
}
