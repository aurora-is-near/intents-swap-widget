import type { ReactNode } from 'react';

interface RadioButtonProps {
  label: string;
  description?: ReactNode;
  isSelected: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export function RadioButton({
  label,
  description,
  isSelected,
  onChange,
  disabled = false,
}: RadioButtonProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-full flex gap-sw-lg items-base p-sw-lg rounded-sw-md border transition-colors ${
        isSelected ? 'bg-sw-gray-800 border-sw-gray-600' : 'border-sw-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      {/* Radio circle */}
      <div
        className={`w-[18px] h-[18px] bg-transparent border-[2px] rounded-full flex items-center justify-center ${
          isSelected ? 'border-sw-accent-500' : 'border-sw-gray-600'
        }`}>
        {isSelected && (
          <div className="w-[10px] h-[10px] bg-sw-accent-500 rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 text-left flex-1 min-w-0">
        <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-50 whitespace-nowrap">
          {label}
        </p>
        {description ? (
          <p className="font-medium text-sm leading-5 tracking-[-0.4px] text-sw-gray-200">
            {description}
          </p>
        ) : null}
      </div>
    </button>
  );
}

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    id: string;
    label: string;
    description?: ReactNode;
  }>;
  disabled?: boolean;
}

export function RadioGroup({
  value,
  onChange,
  options,
  disabled = false,
}: RadioGroupProps) {
  return (
    <div className="space-y-2.5">
      {options.map((option) => (
        <RadioButton
          key={option.id}
          label={option.label}
          description={option.description}
          isSelected={value === option.id}
          onChange={() => onChange(option.id)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
