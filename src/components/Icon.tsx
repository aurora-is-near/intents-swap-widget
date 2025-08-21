import { useState } from 'react';
import type { PropsWithChildren } from 'react';

import { cn } from '@/utils/cn';

type Variant = 'light' | 'dark';
type State = 'loading' | 'loaded' | 'failed';

type Props = {
  radius?: number;
  size?: number;
  label: string;
  variant: Variant;
  noLoadedBg?: boolean;
  icon: React.ReactElement | string | undefined;
};

const Wrapper = ({
  radius = 9999,
  variant,
  children,
  isLoaded,
  noLoadedBg,
  size = 28,
}: PropsWithChildren<{
  radius?: number;
  variant: Variant;
  size: number;
  noLoadedBg: boolean;
  isLoaded: boolean;
}>) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={cn('flex items-center justify-center overflow-hidden', {
      'bg-gray-500':
        variant === 'dark' && ((isLoaded && !noLoadedBg) || !isLoaded),
      'bg-gray-200':
        variant === 'light' && ((isLoaded && !noLoadedBg) || !isLoaded),
      [`rounded-[${radius}px]`]: radius,
    })}>
    {children}
  </div>
);

export const Icon = ({
  variant,
  icon,
  label,
  radius = 9999,
  noLoadedBg = false,
  size = 28,
}: Props) => {
  const [imageState, setImageState] = useState<State>('loading');

  if (typeof icon === 'string' && imageState === 'failed') {
    return (
      <Wrapper
        size={size}
        radius={radius}
        variant={variant}
        noLoadedBg={noLoadedBg}
        isLoaded={false}>
        <span className="text-label-m text-gray-100">
          {label.charAt(0).toUpperCase()}
        </span>
      </Wrapper>
    );
  }

  return (
    <Wrapper
      size={size}
      radius={radius}
      variant={variant}
      noLoadedBg={noLoadedBg}
      isLoaded={typeof icon !== 'string' || imageState === 'loaded'}>
      {!icon ? (
        <span className="text-label-m text-gray-100">
          {label?.charAt(0).toUpperCase()}
        </span>
      ) : typeof icon === 'string' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          width={28}
          height={28}
          src={icon}
          alt={label}
          onLoad={() => setImageState('loaded')}
          onError={() => setImageState('failed')}
        />
      ) : (
        icon
      )}
    </Wrapper>
  );
};
