import type { ReactNode } from 'react';

interface ToggleProps {
  isEnabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: ReactNode;
}

interface ToggleOnlyProps {
  isEnabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function ToggleOnly({
  isEnabled,
  onChange,
  disabled = false,
}: ToggleOnlyProps) {
  return (
    <button
      onClick={() => onChange(!isEnabled)}
      disabled={disabled}
      className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors ${
        isEnabled ? 'bg-csw-gray-50' : 'bg-csw-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span
        className={`inline-block h-csw-xl w-csw-xl transform rounded-full bg-csw-gray-950 transition-transform ${
          isEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

export function Toggle({
  isEnabled,
  onChange,
  disabled = false,
  label,
  description,
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1.5">
        {label ? (
          <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
            {label}
          </p>
        ) : null}
        {description ? (
          <p className="font-medium text-sm leading-5 tracking-[-0.4px] text-csw-gray-200">
            {description}
          </p>
        ) : null}
      </div>
      <ToggleOnly
        isEnabled={isEnabled}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
