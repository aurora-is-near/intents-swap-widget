import { useState } from 'react';
import type { PropsWithChildren } from 'react';

import { cn } from '@/utils/cn';

type State = 'loading' | 'loaded' | 'failed';

type Props = {
  label: string;
  size?: number;
  radius?: number;
  className?: string;
  icon: React.ReactElement | string | undefined;
};

const Wrapper = ({
  children,
  size = 28,
  radius = 9999,
  className,
}: PropsWithChildren<{
  size: number;
  radius?: number;
  className?: string;
}>) => (
  <div
    className={cn(
      'flex items-center justify-center overflow-hidden',
      className,
    )}
    style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: `${radius}px`,
    }}>
    {children}
  </div>
);

export const Icon = ({
  icon,
  label,
  radius = 9999,
  size = 28,
  className,
}: Props) => {
  const [imageState, setImageState] = useState<State>('loading');

  if (typeof icon === 'string' && imageState === 'failed') {
    return (
      <Wrapper size={size} radius={radius} className={className}>
        <span className="text-sw-label-md text-sw-gray-100">
          {label.charAt(0).toUpperCase()}
        </span>
      </Wrapper>
    );
  }

  const Ico = () => {
    if (!icon) {
      return (
        <span className="text-sw-label-m text-sw-gray-100">
          {label?.charAt(0).toUpperCase()}
        </span>
      );
    }

    if (typeof icon === 'string') {
      return (
        <img
          width={28}
          height={28}
          src={icon}
          alt={label}
          onLoad={() => setImageState('loaded')}
          onError={() => setImageState('failed')}
        />
      );
    }

    return icon;
  };

  return (
    <Wrapper size={size} radius={radius} className={className}>
      <Ico />
    </Wrapper>
  );
};
