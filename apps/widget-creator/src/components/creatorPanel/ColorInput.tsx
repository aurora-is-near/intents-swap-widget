import { HexColorPicker } from 'react-colorful';
import ColorPickerIcon from '../../assets/icons/color-picker.svg?react';
import { ColorInputItem } from './ColorInputItem';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isColorPickerOpen: boolean;
  onOpenColorPicker: () => void;
  onCloseColorPicker: () => void;
  themes: (`#${string}` | 'dark' | 'light')[];
}

export const ColorInput = ({
  label,
  value,
  onChange,
  isColorPickerOpen,
  onOpenColorPicker,
  onCloseColorPicker,
  themes,
}: ColorInputProps) => {
  return (
    <div className="space-y-csw-md">
      <div className="flex items-center justify-between">
        <p
          className={`font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200`}>
          {label}
        </p>
        <div className="flex items-center gap-csw-2md">
          {themes.map((themeColor) => {
            const isActive = themeColor.toLowerCase() === value.toLowerCase();

            return (
              <ColorInputItem
                key={themeColor}
                isActive={isActive}
                onClick={() => {
                  onChange(themeColor);
                }}
                color={themeColor}
              />
            );
          })}
          <ColorInputItem
            isActive={
              !themes.includes(value as `#${string}`) || isColorPickerOpen
            }
            onClick={() => {
              onOpenColorPicker();
            }}>
            <ColorPickerIcon />
          </ColorInputItem>
        </div>
      </div>
      {isColorPickerOpen && (
        <div className="bg-csw-gray-800 rounded-csw-md p-csw-md w-fit">
          <HexColorPicker color={value} onChange={onChange} />
          <div className="mt-csw-md flex items-center gap-csw-md">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="bg-csw-gray-700 rounded-csw-sm px-csw-sm py-csw-xs font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-50 outline-none flex-1"
            />
            <button
              onClick={onCloseColorPicker}
              className="px-csw-md py-csw-xs bg-csw-accent-500 text-csw-gray-950 rounded-csw-sm font-semibold text-sm hover:opacity-90 transition-opacity">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
