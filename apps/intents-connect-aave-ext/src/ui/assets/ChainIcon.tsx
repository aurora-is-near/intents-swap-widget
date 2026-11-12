import { useState } from 'react';

import { CHAIN_ICON_URLS } from './chains';
import { chainLabel } from './tokens';

/**
 * A network's icon, with a letter fallback (also when the image fails).
 * Decorative: the network's name next to it is what's read.
 */
export const ChainIcon = ({
  chain,
  size = 16,
}: {
  chain: string;
  size?: number;
}) => {
  const icon = CHAIN_ICON_URLS[chain];
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
      className="flex-none rounded-full object-cover"
    />
  ) : (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.round(size * 0.5) }}
      className="inline-flex flex-none items-center justify-center rounded-full bg-surface-hover font-medium text-text-secondary">
      {chainLabel(chain).charAt(0)}
    </span>
  );
};
