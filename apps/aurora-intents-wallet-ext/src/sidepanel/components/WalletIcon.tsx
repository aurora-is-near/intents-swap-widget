import { cn } from '@aurora-is-near/intents-swap-widget/utils';

type Props = {
  name: string;
  /** Data URI or URL the wallet announced (EIP-6963 / Wallet Standard). */
  icon?: string;
  size?: number;
  className?: string;
};

/** A wallet's own icon, or its initial on a tile when it announced none. */
export const WalletIcon = ({ name, icon, size = 40, className }: Props) =>
  icon ? (
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      className={cn('block shrink-0 rounded-sw-md', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-sw-md bg-sw-gray-800 text-sw-label-lg text-sw-gray-100',
        className,
      )}
      style={{ width: size, height: size }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
