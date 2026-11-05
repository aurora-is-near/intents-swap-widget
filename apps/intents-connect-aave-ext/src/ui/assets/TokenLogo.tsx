import { useState } from 'react';

import { tokenIcon } from './tokens';

/** A token's icon, with a letter fallback (also when the image fails). */
export const TokenLogo = ({
  symbol,
  size = 32,
}: {
  symbol: string;
  size?: number;
}) => {
  const icon = tokenIcon(symbol);
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  return icon && !failed ? (
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      style={style}
      onError={() => setFailed(true)}
      className="flex-none rounded-full bg-surface-hover object-cover"
    />
  ) : (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className="flex flex-none items-center justify-center rounded-full bg-surface-hover font-medium text-text-secondary">
      {symbol.charAt(0)}
    </span>
  );
};
