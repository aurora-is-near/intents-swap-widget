import { SimpleToken } from '@aurora-is-near/intents-swap-widget';
import { ToggleOnly } from '../../uikit/Toggle';
import { TokenTag } from '../../uikit/TokenTag';

interface TokenRowProps {
  token: SimpleToken;
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
  const tokenIcon = token.icon ? (
    <img
      src={token.icon}
      alt={token.symbol}
      className="size-full rounded-full"
    />
  ) : undefined;

  return (
    <div
      className={`flex items-center justify-between px-csw-md py-csw-md bg-csw-gray-800 rounded-csw-md transition-colors ${
        isDisabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-csw-gray-700 transition-colors cursor-pointer'
      }`}
      onClick={() => !isDisabled && onToggle()}>
      <TokenTag
        tokenIcon={tokenIcon}
        tokenSymbol={token.symbol}
        className="flex-1 justify-start bg-transparent"
      />

      {/* Toggle Switch */}
      <ToggleOnly
        isEnabled={isSelected}
        onChange={() => !isDisabled && onToggle()}
      />
    </div>
  );
}
