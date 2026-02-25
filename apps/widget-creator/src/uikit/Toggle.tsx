import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../utils/cn';

interface ToggleProps {
  isEnabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelPosition?: 'left' | 'right';
  description?: ReactNode;
}

interface ToggleOnlyProps {
  isEnabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const getToggleClassNames = (isEnabled: boolean, size: 'sm' | 'md') => {
  const baseClassName =
    'inline-block transform rounded-full bg-csw-gray-950 transition-transform';

  if (size === 'md') {
    return cn(
      baseClassName,
      'h-csw-xl w-csw-xl',
      isEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]',
    );
  }

  return cn(
    baseClassName,
    'h-[12px] w-[12px]',
    isEnabled ? 'translate-x-[14px]' : 'translate-x-[3px]',
  );
};

const getToggleBackgroundClassNames = (
  isEnabled: boolean,
  disabled: boolean,
  size: 'sm' | 'md',
) => {
  const baseClassName = cn(
    'relative inline-flex items-center rounded-full transition-colors',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  );

  if (size === 'md') {
    return cn(
      baseClassName,
      'h-[20px] w-[36px]',
      isEnabled ? 'bg-csw-gray-50' : 'bg-csw-gray-700',
    );
  }

  return cn(
    baseClassName,
    'h-[16px] w-[28px]',
    isEnabled ? 'bg-csw-accent-300' : 'bg-csw-gray-600',
  );
};

export function ToggleOnly({
  isEnabled,
  onChange,
  disabled = false,
  size = 'md',
}: ToggleOnlyProps) {
  return (
    <button
      onClick={() => onChange(!isEnabled)}
      disabled={disabled}
      className={getToggleBackgroundClassNames(isEnabled, disabled, size)}>
      <span className={getToggleClassNames(isEnabled, size)} />
    </button>
  );
}

const ToggleLabel = ({ children }: PropsWithChildren) => (
  <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
    {children}
  </p>
);

export function Toggle({
  isEnabled,
  onChange,
  disabled = false,
  labelPosition = 'left',
  label,
  description,
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-csw-lg">
      {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
      {(label && labelPosition === 'left') || description ? (
        <div className="flex flex-col gap-1.5">
          {label && labelPosition === 'left' ? (
            <ToggleLabel>{label}</ToggleLabel>
          ) : null}
          {description ? (
            <p className="font-medium text-sm leading-5 tracking-[-0.4px] text-csw-gray-200">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      <ToggleOnly
        isEnabled={isEnabled}
        onChange={onChange}
        disabled={disabled}
      />
      {label && labelPosition === 'right' ? (
        <ToggleLabel>{label}</ToggleLabel>
      ) : null}
    </div>
  );
}
