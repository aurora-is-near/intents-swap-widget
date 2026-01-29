import type { ReactNode } from 'react';

type Props = {
  value?: string;
  placeholder: string;
  suffix?: ReactNode;
  onChange: (value: string) => void;
};

export const TextInput = ({ value = '', placeholder, onChange }: Props) => (
  <div className="flex-shrink-0">
    <div className="flex gap-csw-md items-center bg-csw-gray-800 px-csw-lg py-csw-md rounded-csw-md">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-csw-gray-50 placeholder-csw-gray-300 outline-none flex-1 font-medium text-sm leading-4"
      />
    </div>
  </div>
);
